## ADDED Requirements

### Requirement: Insights presents one week, shared with the log

The Insights destination SHALL present exactly one week of expenses at a time. The week SHALL be bounded by the configured first day of the week — the same setting the expense log reads — so that a week means the same span on both destinations.

The week Insights shows SHALL be the week the expense log shows. Moving either destination to another week SHALL move the other to that same week, so that switching between the two never changes which week is on screen.

Insights SHALL open on the week containing the current day. Once the user has moved to another week, on either destination, Insights SHALL continue to show that week until the page is reloaded or the application is opened again; switching to another destination and back SHALL NOT return it to the current week.

#### Scenario: First visit after opening

- **WHEN** the user opens Insights for the first time after opening the application
- **THEN** the week containing the current day is shown
- **AND** the span of that week is named in full

#### Scenario: Browsed week survives leaving the destination

- **WHEN** the user moves Insights to an earlier week, switches to another destination, and returns to Insights
- **THEN** the earlier week is still shown

#### Scenario: Insights follows the log

- **WHEN** the user moves the expense log to an earlier week and then opens Insights
- **THEN** Insights shows that same earlier week
- **AND** every figure on the destination is for that week

#### Scenario: The log follows Insights

- **WHEN** the user moves Insights to a different week and then opens the expense log
- **THEN** the log shows that same week

#### Scenario: Returning to the current week on one destination

- **WHEN** both destinations are showing an earlier week and the user uses the shortcut back to the current week on either one
- **THEN** both destinations show the week containing the current day
- **AND** the shortcut is no longer offered on either

#### Scenario: Week start setting is changed

- **WHEN** the user changes the configured first day of the week and returns to Insights
- **THEN** the week shown is bounded by the new first day
- **AND** every figure on the destination is recalculated for that span

## REMOVED Requirements

### Requirement: Insights presents one week at a time

**Reason**: It required the week Insights shows to be independent of the week the expense log shows (scenario "The two destinations keep separate weeks"). That independence is what this change reverses, and a requirement cannot be modified in a way that drops one of its scenarios.

**Migration**: Replaced by "Insights presents one week, shared with the log", which carries over everything else unchanged: one week at a time, bounded by the configured first day of the week, opening on the current week, and surviving a switch to another destination and back.
