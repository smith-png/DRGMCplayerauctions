$env:PATH += ";C:\Program Files\PostgreSQL\13\bin"
$env:PGPASSWORD = "en75fuj225"

# Check if database exists
$dbExists = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='auction_db'"

if ($dbExists -ne "1") {
    Write-Host "Creating auction_db database..."
    & psql -U postgres -c "CREATE DATABASE auction_db;"
    Write-Host "Database created successfully!"
} else {
    Write-Host "Database auction_db already exists."
}
