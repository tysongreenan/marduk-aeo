import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

supabase = create_client(supabase_url, supabase_key)

def create_logs_table():
    """Create the logs table if it doesn't exist"""
    print("Creating logs table...")
    
    # Create the logs table
    supabase.postgrest.rpc(
        "create_logs_table",
        {
            "table_name": "logs",
            "column_definitions": """
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                task_id uuid REFERENCES monitoring_tasks(id) ON DELETE SET NULL,
                brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
                query_text text,
                status text NOT NULL CHECK (status IN ('success', 'error', 'info', 'warning')),
                error_message text,
                created_at timestamp with time zone DEFAULT now(),
                additional_data jsonb
            """
        }
    ).execute()
    
    print("Logs table created successfully")
    
    # Create RLS policies for the logs table
    print("Setting up RLS policies for logs table...")
    
    # Enable RLS
    supabase.postgrest.rpc(
        "enable_rls",
        {"table_name": "logs"}
    ).execute()
    
    # Admin can see all logs
    supabase.postgrest.rpc(
        "create_policy",
        {
            "table_name": "logs",
            "policy_name": "admin_all",
            "policy_definition": "auth.role() = 'service_role'",
            "policy_operation": "ALL"
        }
    ).execute()
    
    # Users can only see logs for their brands
    supabase.postgrest.rpc(
        "create_policy",
        {
            "table_name": "logs",
            "policy_name": "users_select_own",
            "policy_definition": "auth.uid() = (SELECT user_id FROM brands WHERE id = brand_id)",
            "policy_operation": "SELECT"
        }
    ).execute()
    
    print("RLS policies set up successfully")
    
    # Create index for faster queries
    print("Creating indices for logs table...")
    
    # Index on created_at for time-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "logs",
            "index_name": "logs_created_at_idx",
            "index_definition": "created_at DESC"
        }
    ).execute()
    
    # Index on task_id for task-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "logs",
            "index_name": "logs_task_id_idx",
            "index_definition": "task_id"
        }
    ).execute()
    
    # Index on brand_id for brand-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "logs",
            "index_name": "logs_brand_id_idx",
            "index_definition": "brand_id"
        }
    ).execute()
    
    # Index on status for status-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "logs",
            "index_name": "logs_status_idx",
            "index_definition": "status"
        }
    ).execute()
    
    print("Indices created successfully")
    
    return "Logs table setup completed successfully"

def create_reports_table():
    """Create the reports table if it doesn't exist"""
    print("Creating reports table...")
    
    # Create the reports table
    supabase.postgrest.rpc(
        "create_reports_table",
        {
            "table_name": "reports",
            "column_definitions": """
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
                content text NOT NULL,
                sent boolean DEFAULT false,
                sent_at timestamp with time zone,
                created_at timestamp with time zone DEFAULT now()
            """
        }
    ).execute()
    
    print("Reports table created successfully")
    
    # Create RLS policies for the reports table
    print("Setting up RLS policies for reports table...")
    
    # Enable RLS
    supabase.postgrest.rpc(
        "enable_rls",
        {"table_name": "reports"}
    ).execute()
    
    # Admin can see all reports
    supabase.postgrest.rpc(
        "create_policy",
        {
            "table_name": "reports",
            "policy_name": "admin_all",
            "policy_definition": "auth.role() = 'service_role'",
            "policy_operation": "ALL"
        }
    ).execute()
    
    # Users can only see reports for their brands
    supabase.postgrest.rpc(
        "create_policy",
        {
            "table_name": "reports",
            "policy_name": "users_select_own",
            "policy_definition": "auth.uid() = (SELECT user_id FROM brands WHERE id = brand_id)",
            "policy_operation": "SELECT"
        }
    ).execute()
    
    print("RLS policies set up successfully")
    
    # Create index for faster queries
    print("Creating indices for reports table...")
    
    # Index on created_at for time-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "reports",
            "index_name": "reports_created_at_idx",
            "index_definition": "created_at DESC"
        }
    ).execute()
    
    # Index on brand_id for brand-based queries
    supabase.postgrest.rpc(
        "create_index",
        {
            "table_name": "reports",
            "index_name": "reports_brand_id_idx",
            "index_definition": "brand_id"
        }
    ).execute()
    
    print("Indices created successfully")
    
    return "Reports table setup completed successfully"

if __name__ == "__main__":
    try:
        # Create logs table
        result = create_logs_table()
        print(result)
        
        # Create reports table
        result = create_reports_table()
        print(result)
        
    except Exception as e:
        print(f"Error: {str(e)}") 