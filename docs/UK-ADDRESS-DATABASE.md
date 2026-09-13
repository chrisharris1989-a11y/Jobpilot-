# JobPilot UK address database

JobPilot uses `public.uk_address_lookup` as its local postcode-to-address reference table.

## Full national dataset

The intended source is the OS NGD GB Address collection. OS describes it as a complete and authoritative addressing dataset for Great Britain, supplied as CSV or GeoPackage and updated daily.

The repository does not contain a licensed national address dump. Obtain the dataset through the OS Data Hub and then import it with:

```bash
SUPABASE_URL="..." SUPABASE_SECRET_KEY="..." node scripts/import-os-gb-address.mjs ./path/to/os-gb-address.csv
```

The importer normalises postcodes, stores UPRNs, address fields and coordinates, and upserts by UPRN.

## Important

Customer imports never use this database. Address lookup is only performed when a user explicitly presses **Find address** in a customer or company form.

OS also provides free sample GB Address data for testing, but the sample only covers selected areas and is not a national database.
