package com.walla;

public class OfflineTransaction {
    public String txId;     
    public int amount;
    public long timestamp;
    public String signature;  
    public String payload;
    
    public OfflineTransaction() {}
    
    public OfflineTransaction(String txId, int amount, long timestamp, String signature, String payload) {
        this.txId = txId;
        this.amount = amount;
        this.timestamp = timestamp;
        this.signature = signature;
        this.payload = payload;
    }
}