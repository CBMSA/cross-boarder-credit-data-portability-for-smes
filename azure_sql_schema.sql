 Main Tables

-- Wallets table: stores user-generated wallets
CREATE TABLE Wallets (
    WalletAddress VARCHAR(100) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    BankName NVARCHAR(100),
    AccountNumber NVARCHAR(50),
    BankCode VARCHAR(20),
    Balance DECIMAL(18,2) DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Users table: stores login credentials (expandable for real user auth)
CREATE TABLE Users (
    Username NVARCHAR(100) PRIMARY KEY,
    PasswordHash NVARCHAR(256),  -- You can later use hashed passwords
    WalletAddress VARCHAR(100),
    FOREIGN KEY (WalletAddress) REFERENCES Wallets(WalletAddress)
);

-- Transactions table: includes both interbank and P2P transactions
CREATE TABLE Transactions (
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    Type VARCHAR(50), -- e.g., 'P2P', 'Settlement', 'Interswitch'
    SenderWallet VARCHAR(100),
    RecipientWallet VARCHAR(100),
    Amount DECIMAL(18,2),
    Fee DECIMAL(18,2),
    Tax DECIMAL(18,2),
    Total DECIMAL(18,2),
    Timestamp DATETIME DEFAULT GETDATE(),
    Description NVARCHAR(255)
);

-- Interbank Transfers: separate APIX or Interswitch records
CREATE TABLE BankTransfers (
    TransferID INT IDENTITY(1,1) PRIMARY KEY,
    WalletAddress VARCHAR(100),
    DestinationAccount VARCHAR(50),
    DestinationBankCode VARCHAR(20),
    Amount DECIMAL(18,2),
    Status VARCHAR(50), -- e.g., PENDING, SENT, FAILED
    Timestamp DATETIME DEFAULT GETDATE()
);


---

✅ 2. Indexes and Defaults

-- Index for fast lookup of wallet transactions
CREATE INDEX IX_Transactions_Sender ON Transactions(SenderWallet);
CREATE INDEX IX_Transactions_Recipient ON Transactions(RecipientWallet);


---

✅ 3. Sample Data (Optional)

-- Sample user and wallet
INSERT INTO Wallets (WalletAddress, FullName, BankName, AccountNumber, BankCode, Balance)
VALUES ('0xABC123456789DEF0', 'Admin User', 'CBM SARB', '1234567890', 'CBMSA001', 500000.00);

INSERT INTO Users (Username, PasswordHash, WalletAddress)
VALUES ('admin', 'cbdc2025', '0xABC123456789DEF0');


---

✅ 4. Suggested Stored Procedures (Optional Advanced)

-- Transfer funds between wallets (P2P or internal)
CREATE PROCEDURE TransferBetweenWallets
    @FromWallet VARCHAR(100),
    @ToWallet VARCHAR(100),
    @Amount DECIMAL(18,2),
    @Type VARCHAR(50)
AS
BEGIN
    DECLARE @Fee DECIMAL(18,2) = @Amount * 0.01;
    DECLARE @Total DECIMAL(18,2) = @Amount + @Fee;

    BEGIN TRANSACTION;

    UPDATE Wallets SET Balance = Balance - @Total WHERE WalletAddress = @FromWallet;
    UPDATE Wallets SET Balance = Balance + @Amount WHERE WalletAddress = @ToWallet;

    INSERT INTO Transactions (Type, SenderWallet, RecipientWallet, Amount, Fee, Total, Description)
    VALUES (@Type, @FromWallet, @ToWallet, @Amount, @Fee, @Total, 'Automated transfer');

    COMMIT;
END





