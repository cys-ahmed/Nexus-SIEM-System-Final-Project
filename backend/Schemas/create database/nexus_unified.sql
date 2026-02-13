










CREATE SCHEMA IF NOT EXISTS auth_schema;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth_schema.authentication ( 
    user_id SERIAL PRIMARY KEY, 
    username VARCHAR(100) UNIQUE NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL, 
    salt TEXT NOT NULL, 
    account_status VARCHAR(50) NOT NULL DEFAULT 'active', 
    created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, 
    last_login TIMESTAMPTZ, 
    reset_code VARCHAR(10), 
    reset_code_expires TIMESTAMP, 
    mfa_pin VARCHAR(10), 
    mfa_pin_expires TIMESTAMP 
); 

CREATE TABLE IF NOT EXISTS auth_schema.role ( 
    role_id SERIAL PRIMARY KEY, 
    role_name VARCHAR(100) UNIQUE NOT NULL, 
    description TEXT 
); 

CREATE TABLE IF NOT EXISTS auth_schema.permissions ( 
    permissions_id SERIAL PRIMARY KEY, 
    permissions_name VARCHAR(100) UNIQUE NOT NULL, 
    description TEXT 
); 

CREATE TABLE IF NOT EXISTS auth_schema.user_roles ( 
    junction1_id SERIAL PRIMARY KEY, 
    user_id INT NOT NULL, 
    role_id INT NOT NULL, 
    CONSTRAINT fk_user 
        FOREIGN KEY(user_id) 
        REFERENCES auth_schema.authentication(user_id) 
        ON DELETE CASCADE, 
    CONSTRAINT fk_role 
        FOREIGN KEY(role_id) 
        REFERENCES auth_schema.role(role_id) 
        ON DELETE CASCADE, 
    UNIQUE (user_id, role_id) 
); 

CREATE TABLE IF NOT EXISTS auth_schema.role_permissions ( 
    role_id INT NOT NULL, 
    permissions_id INT NOT NULL, 
    CONSTRAINT fk_role 
        FOREIGN KEY(role_id) 
        REFERENCES auth_schema.role(role_id) 
        ON DELETE CASCADE, 
    CONSTRAINT fk_permissions 
        FOREIGN KEY(permissions_id) 
        REFERENCES auth_schema.permissions(permissions_id) 
        ON DELETE CASCADE, 
    PRIMARY KEY (role_id, permissions_id) 
); 




CREATE SCHEMA IF NOT EXISTS client_schema;

CREATE TABLE IF NOT EXISTS client_schema."Devices" (
    "Device_Id" VARCHAR PRIMARY KEY,
    "Device_type" VARCHAR,
    "Ip_Address" INET NOT NULL,
    "Status" VARCHAR, 
    "Os" VARCHAR,
    "Hostname" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS client_schema."Logs" (
    "Log_ID" BIGINT PRIMARY KEY,
    "Log_Type" VARCHAR NOT NULL,
    "Status" VARCHAR,
    "Timestamp" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_schema."EVENT" (
    "Event_Id" BIGINT PRIMARY KEY,
    "Timestamp" TIMESTAMPTZ NOT NULL,
    "Severity" REAL,
    "Description " VARCHAR NOT NULL, 
    "Event_type" VARCHAR NOT NULL,
    "Src_ip" INET NOT NULL,
    "Dest_ip" INET,
    "Dev_id" VARCHAR NOT NULL,
    "log_id" BIGINT NOT NULL,
    "ingestion_timestamp" TIMESTAMP DEFAULT NOW(),
    "source_service" VARCHAR NOT NULL,
    "source_process" VARCHAR NOT NULL,
    "source_process_id" INTEGER NOT NULL,
    "source_module" VARCHAR NOT NULL,
    "Hostname" VARCHAR,
    FOREIGN KEY ("Dev_id") REFERENCES client_schema."Devices"("Device_Id"),
    FOREIGN KEY ("log_id") REFERENCES client_schema."Logs"("Log_ID")
);

CREATE TABLE IF NOT EXISTS client_schema."Detections" (
    "Detection_Id" BIGSERIAL PRIMARY KEY,
    "Rule_Name" VARCHAR(255) NOT NULL,
    "Rule_Category" VARCHAR(100) NOT NULL,
    "Severity" VARCHAR(50) NOT NULL,
    "Description" TEXT NOT NULL,
    "Event_Ids" BIGINT[] NOT NULL,
    "Src_Ip" INET,
    "Username" VARCHAR(255),
    "Timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Metadata" JSONB,
    "Status" VARCHAR(50) DEFAULT 'new',
    "Created_At" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_schema."Alert" (
    "ALERT_ID" BIGSERIAL PRIMARY KEY,
    "Event_Id" BIGINT,
    "Detection_Id" BIGINT,
    "Timestamp" TIMESTAMPTZ,
    "Status" VARCHAR,
    "Severity" VARCHAR,
    "Title" VARCHAR(255),
    "Description" TEXT,
    "Source" VARCHAR(255),
    "Stage_Checks" JSONB DEFAULT '[]',
    "Review_Notes" TEXT DEFAULT '',
    FOREIGN KEY ("Event_Id") REFERENCES client_schema."EVENT"("Event_Id"),
    FOREIGN KEY ("Detection_Id") REFERENCES client_schema."Detections"("Detection_Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_schema."Resolved" (
    "Resolved_Id" BIGSERIAL PRIMARY KEY,
    "Original_Detection_Id" BIGINT UNIQUE,
    "Rule_Name" VARCHAR(255) NOT NULL,
    "Rule_Category" VARCHAR(100) NOT NULL,
    "Severity" VARCHAR(50) NOT NULL,
    "Description" TEXT NOT NULL,
    "Event_Ids" BIGINT[] NOT NULL,
    "Src_Ip" INET,
    "Username" VARCHAR(255),
    "Detection_Timestamp" TIMESTAMP NOT NULL,
    "Metadata" JSONB,
    "Resolved_At" TIMESTAMP DEFAULT NOW(),
    "Resolution_Notes" TEXT,
    "Resolved_By" VARCHAR(255),
    FOREIGN KEY ("Original_Detection_Id") REFERENCES client_schema."Detections"("Detection_Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_schema."Notifications" (
    "id" SERIAL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) DEFAULT 'info',
    "title" VARCHAR(255),
    "source" VARCHAR(255),
    "severity" VARCHAR(50),
    "is_read" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "alert_id" BIGINT,
    "recovery" INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON client_schema."Notifications" ("alert_id");




CREATE SCHEMA IF NOT EXISTS server_schema;

CREATE TABLE IF NOT EXISTS server_schema."Devices" (
    "Device_id" VARCHAR PRIMARY KEY,
    "Device_type" VARCHAR,
    "Ip_Address" INET NOT NULL,
    "Status" VARCHAR,
    "Os" VARCHAR,
    "Hostname" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS server_schema."Logs" (
    "log_id" BIGINT PRIMARY KEY,
    "log_type" VARCHAR,
    "logfile" TEXT,
    "Dev_id" VARCHAR NOT NULL,
    FOREIGN KEY ("Dev_id") REFERENCES server_schema."Devices"("Device_id")
);

CREATE TABLE IF NOT EXISTS server_schema."users" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_schema."log_gen" (
    "log_g_id" INTEGER PRIMARY KEY,
    "usr_id" INTEGER NOT NULL,
    "log_id" BIGINT NOT NULL,
    FOREIGN KEY ("log_id") REFERENCES server_schema."Logs"("log_id"),
    FOREIGN KEY ("usr_id") REFERENCES server_schema."users"("id")
);
