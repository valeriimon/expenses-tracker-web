## ADDED Requirements

### Requirement: The viewed week is shared with Insights

The week the expense log shows SHALL be the week the Insights destination shows. Any action that changes the week the log displays — the week controls, the swipe, the shortcut back to the current week, or saving an expense dated in another week — SHALL change the week Insights displays to the same one, and a change of week made on Insights SHALL likewise change the week the log displays.

Each destination SHALL keep its own controls for moving between weeks; sharing the week SHALL NOT remove week navigation from either.

#### Scenario: Navigating the log moves Insights

- **WHEN** the user moves the log to the preceding week and opens Insights
- **THEN** Insights shows that preceding week

#### Scenario: Navigating Insights moves the log

- **WHEN** the user moves Insights to another week and returns to the log
- **THEN** the log displays that week, grouped by day
- **AND** the log's on-screen date range names that week

#### Scenario: Saving into another week moves both

- **WHEN** the user saves an expense dated inside a week other than the one being viewed and then opens Insights
- **THEN** the log displays the week that contains the saved expense
- **AND** Insights shows that same week, with the saved expense included in its figures

#### Scenario: Viewing imported expenses moves both

- **WHEN** the user completes an import, chooses to view the imported expenses, and then opens Insights
- **THEN** the log displays the week the imported expenses begin in
- **AND** Insights shows that same week
