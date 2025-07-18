CREATE TABLE Users (
  Id INT PRIMARY KEY IDENTITY,
  WalletAddress NVARCHAR(100),
  FullName NVARCHAR(100),
  BankName NVARCHAR(100),
  BankCode NVARCHAR(20),
  AccountNumber NVARCHAR(50),
  Password NVARCHAR(100),
  Verified BIT DEFAULT 0,
  Balance DECIMAL(38,2),
  CreatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE Transactions (
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  FromWallet NVARCHAR(100),
  ToWallet NVARCHAR(100),
  Amount DECIMAL(38,2),
  Tax DECIMAL(38,2),
  Total DECIMAL(38,2),
  Type NVARCHAR(50),
  Timestamp DATETIME DEFAULT GETDATE()
);

CREATE TABLE AdminWallet (
  Id INT PRIMARY KEY IDENTITY,
  WalletAddress NVARCHAR(100),
  Balance DECIMAL(38,2)
);