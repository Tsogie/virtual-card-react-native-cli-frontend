import customtkinter as ctk
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import NoCardException, CardConnectionException

import threading
import time
import queue

import os
from smartcard.util import toHexString

# ============ CONFIG ============ #
WINDOW_TITLE = "Virtual Transit Reader"
LOG_BG = "white"
LOG_FG = "black"
STATUS_OFF = "grey"
STATUS_OK = "green"
STATUS_FAIL = "red"
# ================================= #
DEFAULT_AID = "A00000080457414C4C4101"
DEFAULT_FARE = 3
CONNECT_RETRY_DELAY = 0.25   # seconds between connect attempts
TRANSMIT_RETRY_DELAY = 0.08  # small retry for transient errors
TRANSMIT_RETRIES = 4
CARD_POLL_SLEEP = 0.15       # sleep inside wait loop to avoid busy spin

ui_queue = None  # define at top of file


def log(msg, status=None):
    global ui_queue
    if ui_queue:
        ui_queue.put((msg, status))
    print(msg)

def build_select_apdu(aid_hex_str):
    aid_bytes = bytes.fromhex(aid_hex_str.replace(" ", ""))
    lc = len(aid_bytes)
    # SELECT by AID, add Le=0x00 to request all data (some readers expect Le)
    return [0x00, 0xA4, 0x04, 0x00, lc] + list(aid_bytes) + [0x00]
 
def build_deduct_apdu(fare_int):
    fare_bytes = fare_int.to_bytes(4, byteorder='big')
    return [0x80, 0x10, 0x00, 0x00, 0x04] + list(fare_bytes)

def choose_reader(pref_name=None):
    r = readers()
    if not r:
        log("[ERROR] No PC/SC readers found.")
        return None
    if pref_name:
        for rd in r:
            if pref_name.lower() in str(rd).lower():
                return rd
        log(f"[WARN] Preferred reader '{pref_name}' not found. Using default reader.")
    return r[0]

def wait_for_card_and_connect(conn):
    while True:
        try:
            conn.connect()
            return True
        except NoCardException:
            time.sleep(CARD_POLL_SLEEP)
        except CardConnectionException as e:
            log(f"[WARN] Connection exception (likely too fast tap): {e}")
            time.sleep(0.5)  # cooldown before next retry
        except Exception as e:
            log(f"[ERROR] Unexpected: {e}")
            time.sleep(0.5)

def transmit_with_retries(conn, apdu, retries=TRANSMIT_RETRIES):
    for attempt in range(1, retries + 1):
        try:
            start = time.time()
            data, sw1, sw2 = conn.transmit(apdu)
            elapsed_ms = (time.time() - start) * 1000.0
            return data, sw1, sw2, elapsed_ms
        except CardConnectionException as e:
            log(f"[WARN] transmit attempt {attempt} failed: {e}")
            if attempt < retries:
                time.sleep(TRANSMIT_RETRY_DELAY)
                try:
                    conn.connect()  # try reconnect
                except Exception:
                    pass
            else:
                raise

def wait_for_card_removal(conn):
    print("[INFO] Waiting for card removal before next tap...")
    while True:
        try:
            conn.connect()
            # still present
            conn.disconnect()
            time.sleep(0.2)
        except NoCardException:
            log("[INFO] Card removed.")
            time.sleep(0.5)  # give reader time to reset before next loop
            break
        except CardConnectionException:
            # sometimes disconnect raises this when card already gone
            log("[INFO] Card removed (connection error).")
            time.sleep(0.5)
            break
        except Exception:
            time.sleep(0.2)

class ReaderUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title(WINDOW_TITLE)
        self.geometry("700x400")
        ctk.set_appearance_mode("light")

        # Queue for logs coming from background thread
        self.log_queue = queue.Queue()

        # === Layout === #
        self.status_label = ctk.CTkLabel(self, text="●", text_color=STATUS_OFF, font=("Arial", 60))
        self.status_label.pack(pady=(10, 0))

        self.status_text = ctk.CTkLabel(self, text="Waiting for card...", font=("Arial", 16))
        self.status_text.pack(pady=(0, 10))

        self.log_box = ctk.CTkTextbox(self, width=650, height=250, corner_radius=8)
        self.log_box.configure(state="disabled", fg_color=LOG_BG, text_color=LOG_FG)
        self.log_box.pack(padx=20, pady=10)

        # Start UI update loop
        self.after(100, self.process_log_queue)

    def process_log_queue(self):
        """Called periodically to pull log messages from queue and update UI."""
        try:
            while True:
                msg, status = self.log_queue.get_nowait()
                self.append_log(msg)
                if status == "ok":
                    self.update_status(True)
                elif status == "fail":
                    self.update_status(False)
                elif status == "wait":
                    self.update_status(None)
        except queue.Empty:
            pass
        self.after(100, self.process_log_queue)

    def append_log(self, text):
        self.log_box.configure(state="normal")
        self.log_box.insert("end", text + "\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def update_status(self, ok: bool | None):
        if ok is True:
            self.status_label.configure(text_color=STATUS_OK)
            self.status_text.configure(text="Transaction OK ✅")
            self.after(4000, lambda: self.update_status(None))
        elif ok is False:
            self.status_label.configure(text_color=STATUS_FAIL)
            self.status_text.configure(text="Transaction Failed ❌")
            self.after(4000, lambda: self.update_status(None))
        else:
            self.status_label.configure(text_color=STATUS_OFF)
            self.status_text.configure(text="Waiting for card...")

# Example backend thread 
def real_reader_loop(ui_queue, aid_hex, fare, pref_reader=None):
    try:
        reader = choose_reader(pref_reader)
        if not reader:
            ui_queue.put(("[ERROR] No reader found.", "fail"))
            return

        conn = reader.createConnection()
        select_apdu = build_select_apdu(aid_hex)
        deduct_apdu = build_deduct_apdu(fare)

        ui_queue.put(("[INFO] Using reader: " + str(reader), "wait"))

        while True:
            ui_queue.put(("[INFO] Waiting for card...", "wait"))
            wait_for_card_and_connect(conn)

            # === START TOTAL TIME ===
            tap_start = time.perf_counter()
            
            try:
                # SELECT AID
                data, sw1, sw2, t_select = transmit_with_retries(conn, select_apdu)
                ui_queue.put((f"[RX] SELECT ({t_select:.1f}ms) SW={sw1:02X}{sw2:02X}", None))

                if (sw1, sw2) != (0x90, 0x00):
                    ui_queue.put(("[FAIL] AID selection failed.", "fail"))
                    conn.disconnect()
                    wait_for_card_removal(conn)
                    continue

                ui_queue.put(("[OK] AID selected", None))
                
                
                # DEDUCT
                deduct_apdu = build_deduct_apdu(fare)
                data, sw1, sw2, t_deduct = transmit_with_retries(conn, deduct_apdu)
                ui_queue.put((f"[RX] DEDUCT ({t_deduct:.1f}ms) SW={sw1:02X}{sw2:02X}", None))
                
                # === END TOTAL TIME ===
                total_ms = (time.perf_counter() - tap_start) * 1000.0
                
                if (sw1, sw2) == (0x90, 0x00):
                    ui_queue.put((f"[OK] Fare deducted ✓  Total: {total_ms:.0f}ms (SELECT: {t_select:.0f}ms + DEDUCT: {t_deduct:.0f}ms)", "ok"))
                else:
                    ui_queue.put((f"[FAIL] Deduct failed  Total: {total_ms:.0f}ms", "fail"))
         
            except Exception as e:
                total_ms = (time.perf_counter() - tap_start) * 1000.0
                ui_queue.put((f"[ERROR] {e}  (after {total_ms:.0f}ms)", "fail"))

            try:
                conn.disconnect()
            except Exception:
                pass

            wait_for_card_removal(conn)

    except KeyboardInterrupt:
        ui_queue.put(("[INFO] Stopped by user.", "fail"))


# === MAIN === #
if __name__ == "__main__":
    app = ReaderUI()
    
    AID = "A00000080457414C4C4101"
    FARE = 3

    ui_queue = app.log_queue
    threading.Thread(
        target=real_reader_loop,
        args=(app.log_queue, AID, FARE, None),  # None = default reader
        daemon=True
    ).start()


    app.mainloop()