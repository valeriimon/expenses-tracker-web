## Purpose

Defines how expense data recorded outside the application is brought into it: the Data destination, choosing a file, describing that file's shape so the application can read it, and what committing an import does to the expenses and categories already present. Getting data back out again belongs to a later change.

## Requirements

### Requirement: Data destination

The application SHALL present a Data destination among its top-level destinations, containing an Import section and an Export section.

The Import section SHALL offer starting a CSV import. The Export section SHALL state in plain language that exporting will be available later, so the destination announces its full purpose without offering an action that does nothing.

#### Scenario: Viewing the Data destination

- **WHEN** the user opens the Data destination
- **THEN** an Import section is shown offering to import expenses from a CSV file
- **AND** an Export section is shown stating that exporting is not available yet
- **AND** no export action is offered

### Requirement: Choosing a file to import

The user SHALL be able to start an import by choosing a CSV file from their device using the browser's own file chooser. The file SHALL be read in the browser and SHALL NOT be uploaded anywhere. Dismissing the chooser without selecting a file SHALL leave the application exactly as it was.

A chosen file SHALL be rejected, with a stated reason and the option to choose another, when it is empty, when it has no rows beyond its header, or when it is too large to import.

#### Scenario: Choosing a file

- **WHEN** the user starts an import and selects a CSV file
- **THEN** the application reads the file and presents the column mapping step
- **AND** the file's column names are available to map to

#### Scenario: Dismissing the file chooser

- **WHEN** the user starts an import and dismisses the chooser without selecting a file
- **THEN** no import begins
- **AND** the Data destination is unchanged

#### Scenario: File with no data rows

- **WHEN** the user selects a file that is empty or contains only a header row
- **THEN** the application states that the file contains no expenses to import
- **AND** offers to choose a different file
- **AND** nothing is imported

#### Scenario: File that is too large

- **WHEN** the user selects a file larger than the application can import
- **THEN** the application states that the file is too large and gives the limit
- **AND** nothing is imported

### Requirement: Reading the file's columns

The application SHALL treat the file's first row as its header and SHALL take the column names offered for mapping from that row.

Field values SHALL be read according to the conventions of comma-separated values: a field enclosed in double quotes may contain the field separator and is taken whole, and a doubled quote inside such a field denotes one literal quote. A row whose field count differs from the header's SHALL be reported as an invalid row rather than silently padded or truncated.

#### Scenario: Header supplies the column names

- **WHEN** a file is read
- **THEN** the names in its first row are the columns offered for mapping
- **AND** the remaining rows are the ones considered for import

#### Scenario: A field containing the separator

- **WHEN** a row contains a quoted field whose text includes the field separator, such as a description listing several items
- **THEN** that field's whole text is read as one value
- **AND** the row's remaining fields are read from the correct positions

#### Scenario: A row with the wrong number of fields

- **WHEN** a row has more or fewer fields than the header has columns
- **THEN** that row is reported as invalid, identified by its position in the file

### Requirement: Mapping the application's fields to the file's columns

The application SHALL name the fields it stores for an expense — date, description, amount, and category — and for each SHALL let the user choose which of the file's columns supplies it. The user SHALL NOT be asked to rename or reorder columns in their file.

Date, description, and amount SHALL each be mapped before an import can proceed. Category MAY be left unmapped, in which case every imported expense SHALL be assigned the built-in general-purpose category. A column in the file that the user maps to nothing SHALL be ignored entirely.

The same file column SHALL NOT be mapped to two different application fields.

#### Scenario: Mapping the required fields

- **WHEN** the user maps the application's date, description, and amount fields to columns in the file
- **THEN** the import can proceed to the preview
- **AND** the values for each field are read from the columns the user chose

#### Scenario: A required field left unmapped

- **WHEN** the user has not chosen a column for date, description, or amount
- **THEN** the application does not let the import proceed
- **AND** it indicates which fields still need a column

#### Scenario: Category left unmapped

- **WHEN** the user leaves the category field unmapped and completes the import
- **THEN** every imported expense carries the built-in general-purpose category
- **AND** no category is created

#### Scenario: Columns the application has no field for

- **WHEN** the file contains columns beyond those the user mapped
- **THEN** those columns are ignored
- **AND** their contents have no effect on what is imported

#### Scenario: Choosing a column already in use

- **WHEN** the user chooses a column that is already mapped to another application field
- **THEN** the application prevents the same column supplying two fields
- **AND** makes clear which field that column is mapped to

### Requirement: Stating how dates are written

The application SHALL let the user state the format of the mapped date column, chosen from formats the application supports rather than typed freely. When the chosen format carries no year, the application SHALL also let the user choose the year to apply to every imported row, defaulting to the current year.

A date value that does not parse under the chosen format SHALL make its row invalid.

#### Scenario: A format that includes the year

- **WHEN** the user selects a date format that includes a year and the file's values match it
- **THEN** each row's expense is dated as that value states

#### Scenario: A format with no year

- **WHEN** the user selects a date format containing only a day and a month, as `05.08` is
- **THEN** the application asks which year to apply
- **AND** every imported expense is dated in the chosen year
- **AND** the preview shows the resulting full dates before anything is imported

#### Scenario: Day and month order

- **WHEN** the user selects a format stating that the day comes before the month
- **THEN** `05.08` is read as the fifth of August, not the eighth of May

#### Scenario: A value that does not match the chosen format

- **WHEN** a row's date value cannot be read under the chosen format
- **THEN** that row is reported as invalid, identified by its position in the file and the value that failed

### Requirement: Validating rows before anything is imported

The application SHALL validate every row before writing anything. A row SHALL be invalid when its date does not parse, when its description is empty after surrounding whitespace is removed, or when its amount is missing, unparseable, zero, or negative — the same conditions under which the entry form refuses a save.

Amounts SHALL be read allowing the decimal separators and digit grouping the application already accepts when an amount is typed.

#### Scenario: Amounts as the reference file writes them

- **WHEN** the amount column holds whole numbers, or values with a fractional part separated by a comma or a full stop, or values whose digits are grouped by spaces
- **THEN** each is read as the amount it represents
- **AND** the preview shows it formatted as the application displays amounts

#### Scenario: An unusable amount

- **WHEN** a row's amount is empty, not a number, zero, or negative
- **THEN** that row is reported as invalid, identified by its position in the file and the reason

#### Scenario: An empty description

- **WHEN** a row's description is empty or only whitespace
- **THEN** that row is reported as invalid, identified by its position in the file

### Requirement: Previewing before committing

Before anything is written, the application SHALL show the user what the import will do: how many rows will be imported, which categories will be created, how many rows duplicate an expense already recorded, and a sample of rows as the application has read them, showing the parsed date, description, amount, and category.

The user SHALL be able to go back and change the mapping, the date format, or the file, and SHALL be able to abandon the import. Nothing SHALL be written until the user confirms.

#### Scenario: Reviewing an import

- **WHEN** the user has mapped the fields and stated the date format
- **THEN** the application shows the number of rows to be imported, the categories it will create, and the number of duplicate rows it will skip
- **AND** shows a sample of rows with their parsed date, description, amount, and category

#### Scenario: Changing the mapping after seeing the preview

- **WHEN** the user returns from the preview and maps a field to a different column
- **THEN** the preview reflects the new mapping when shown again
- **AND** nothing has been written in the meantime

#### Scenario: Abandoning an import

- **WHEN** the user abandons the import at any point before confirming
- **THEN** no expense and no category is created
- **AND** the application returns to the Data destination

### Requirement: An import is all or nothing

If any row is invalid, the application SHALL import nothing and SHALL instead report every invalid row with its position in the file and the reason it failed, so the user can correct the file and import again.

When every row is valid and the user confirms, the categories to be created and the expenses to be imported SHALL be written together as a single operation. If that operation cannot be completed, nothing SHALL be written: no expense, no category, and no partial import.

#### Scenario: A file containing invalid rows

- **WHEN** the user confirms an import of a file in which one or more rows are invalid
- **THEN** no expense and no category is created
- **AND** every invalid row is listed with its position and the reason it failed

#### Scenario: Correcting the file and importing again

- **WHEN** the user corrects the rows that failed and imports the file again
- **THEN** the import proceeds
- **AND** the previously failing rows are imported along with the rest

#### Scenario: A failure while committing

- **WHEN** the import cannot be completed after the user confirms
- **THEN** the application states that nothing was imported
- **AND** the expenses and categories present before the import are unchanged

### Requirement: Categories the file names are created as needed

Each distinct category value in the file SHALL be matched against the application's existing categories, built-in and user-created alike, ignoring letter case and surrounding whitespace. A value that matches an existing category SHALL file its expenses under that category. A value that matches none SHALL be created as a new user-created category, named as the file writes it with surrounding whitespace removed.

Two values in the file that differ only in letter case or surrounding whitespace SHALL be treated as one category, so one category is created rather than two. A row whose category value is empty SHALL be assigned the built-in general-purpose category rather than making the row invalid.

Categories created by an import SHALL be indistinguishable from categories the user created by hand: they appear in the entry form's picker and in the category management surface, and they can be renamed and deleted there.

#### Scenario: A category the application does not have

- **WHEN** the file names a category that matches no existing category
- **THEN** a user-created category with that name is created as part of the import
- **AND** every row naming it is filed under it

#### Scenario: A category the application already has

- **WHEN** the file names a category matching an existing category's name, differing at most in letter case or surrounding whitespace
- **THEN** no category is created
- **AND** the rows naming it are filed under the existing category

#### Scenario: The same new category on many rows

- **WHEN** many rows name the same category that the application does not have, written with differing case or surrounding whitespace
- **THEN** exactly one category is created
- **AND** every one of those rows is filed under it

#### Scenario: An empty category value

- **WHEN** a row's category value is empty or only whitespace
- **THEN** the row is imported with the built-in general-purpose category
- **AND** the row is not reported as invalid

#### Scenario: Managing a category an import created

- **WHEN** the user opens the category management surface after an import that created categories
- **THEN** those categories are listed as the user's own
- **AND** rename and delete are offered for them

### Requirement: Rows already recorded are skipped

A row SHALL be treated as a duplicate, and SHALL NOT be imported, when an expense recorded before the import began has the same date, the same description, and the same amount. Duplicate rows SHALL NOT make the import fail.

Rows within the file that duplicate one another SHALL all be imported, since a genuine pair of identical expenses on one day is something the user may have recorded.

#### Scenario: Importing the same file twice

- **WHEN** the user imports a file and then imports the same file again
- **THEN** the second import creates no expense
- **AND** it reports every row as a duplicate that was skipped
- **AND** no category is created the second time

#### Scenario: A file overlapping what is already recorded

- **WHEN** a file contains some rows matching expenses already recorded and some that do not
- **THEN** only the rows that do not match are imported
- **AND** the rows that match are reported as skipped duplicates
- **AND** the expenses already recorded are unchanged

#### Scenario: Identical rows within one file

- **WHEN** a file contains two rows with the same date, description, and amount, neither matching an existing expense
- **THEN** both are imported as separate expenses

### Requirement: Reporting the result of an import

After an import completes, the application SHALL report how many expenses were imported, how many rows were skipped as duplicates, and which categories were created. The user SHALL be able to go from that report to the imported expenses.

#### Scenario: A completed import

- **WHEN** an import completes
- **THEN** the application states how many expenses were imported, how many duplicate rows were skipped, and the names of any categories created
- **AND** offers to view the imported expenses

#### Scenario: Imported expenses in the log

- **WHEN** the user opens the Expenses destination after an import and navigates to a week the imported expenses fall in
- **THEN** those expenses appear under their day groups with the date, description, amount, and category the import gave them
- **AND** the day and week totals include them

#### Scenario: Imported expenses persist

- **WHEN** the user imports expenses, closes the browser, and opens the application again
- **THEN** the imported expenses and any categories the import created are still present
