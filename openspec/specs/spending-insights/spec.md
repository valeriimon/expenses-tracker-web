## Purpose

Defines what the Insights destination tells a user about a single week of their own spending: what the week cost, how that total divides across categories, and whether the week is unusual measured against the weeks that came before it. The expense-tracking capability owns the record of what was spent; this capability owns what is read out of it.

## Requirements

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

### Requirement: Week navigation within Insights

Insights SHALL offer navigation to the immediately preceding week, to the immediately following week, and directly back to the week containing the current day. The shortcut back to the current week SHALL be offered only when another week is being shown.

Navigation SHALL be available both through visible controls and through a horizontal swipe over the destination's content, matching the gesture the expense log uses.

#### Scenario: Moving to an adjacent week

- **WHEN** the user activates the control for the previous or the following week
- **THEN** Insights shows that week
- **AND** the named span and every figure update to that week

#### Scenario: Returning to the current week

- **WHEN** the user is viewing a week other than the current one and activates the shortcut back to the current week
- **THEN** Insights shows the week containing the current day
- **AND** the shortcut is no longer offered

#### Scenario: Shortcut is not offered where it would do nothing

- **WHEN** the user is viewing the week containing the current day
- **THEN** the shortcut back to the current week is not presented as an available action to touch, pointer, keyboard, or assistive technology
- **AND** the content below it does not shift position compared with viewing any other week

#### Scenario: Swiping between weeks

- **WHEN** the user swipes horizontally across the destination's content
- **THEN** Insights moves to the adjacent week in the direction of the swipe
- **AND** the result is identical to using the corresponding control

### Requirement: The week total

Insights SHALL display the sum of every expense recorded in the week on screen, shown with the currency symbol as a total.

#### Scenario: Total of the week on screen

- **WHEN** the user views a week containing recorded expenses
- **THEN** the sum of those expenses is displayed
- **AND** it carries the currency symbol
- **AND** it equals the week total the expense log shows for the same week

### Requirement: Category breakdown

Insights SHALL break the week's total down by category, listing every category in which the week recorded at least one expense, ordered from the largest amount to the smallest. A category with no expense in the week SHALL be omitted rather than listed at zero.

Each entry SHALL name its category and show what that category cost during the week. Each entry SHALL additionally carry a measure whose length is proportional to that category's amount, with the largest amount in the week occupying the full available length.

The amounts listed SHALL sum to the week total.

#### Scenario: Categories listed in order of size

- **WHEN** the user views a week in which several categories recorded expenses
- **THEN** each of those categories appears exactly once, largest amount first
- **AND** each shows the total the week recorded in it

#### Scenario: Categories without spending are absent

- **WHEN** a category exists but recorded no expense in the week on screen
- **THEN** that category does not appear in the breakdown

#### Scenario: Measures are proportional within the week

- **WHEN** the breakdown displays two categories, one having cost twice the other
- **THEN** the longer measure is twice the length of the shorter
- **AND** the largest category's measure occupies the full available length

#### Scenario: The breakdown accounts for the whole week

- **WHEN** the user views a week containing recorded expenses
- **THEN** the amounts shown against the categories sum exactly to the displayed week total

#### Scenario: A user-created category in the breakdown

- **WHEN** the week contains expenses filed under a category the user created
- **THEN** that category appears in the breakdown under its own name, alongside the built-in ones

### Requirement: The typical week baseline

Insights SHALL derive a typical-week figure from the user's own history: the median of the week totals of the eight weeks immediately preceding the week on screen, counting only those weeks in which at least one expense was recorded. Weeks with no recorded expenses SHALL be treated as gaps — excluded from the median and not counted toward the number of weeks available.

Where fewer than four such weeks are available, Insights SHALL omit the comparison entirely rather than present a baseline drawn from too little history.

The baseline SHALL be derived from the weeks preceding whichever week is on screen, so that a week viewed in the past is measured against the weeks that preceded it rather than against the present.

#### Scenario: Baseline from sufficient history

- **WHEN** the user views a week preceded by at least four weeks that recorded expenses
- **THEN** a typical-week figure is displayed
- **AND** it is the median of the week totals of the qualifying weeks among the preceding eight

#### Scenario: Weeks without expenses are gaps

- **WHEN** some of the eight preceding weeks recorded no expenses at all
- **THEN** those weeks contribute nothing to the typical-week figure
- **AND** they do not count toward the four weeks the comparison requires

#### Scenario: Too little history

- **WHEN** fewer than four of the eight preceding weeks recorded any expenses
- **THEN** no typical-week figure and no comparison are shown
- **AND** the rest of the destination is displayed normally

#### Scenario: A week viewed in the past

- **WHEN** the user navigates to a week several weeks earlier and a baseline is available for it
- **THEN** the typical-week figure is drawn from the weeks preceding that week
- **AND** weeks later than the week on screen do not contribute to it

### Requirement: How the comparison is expressed

Where a baseline is available, Insights SHALL state the relationship between the week on screen and that baseline.

For a week that has not yet ended and whose total is below the baseline, the difference SHALL be expressed as remaining headroom — what may still be spent before the week reaches a typical one — rather than as a shortfall. The week is unfinished, so a figure below the baseline is not yet a result.

For a week whose total is at or above the baseline, and for any week that has already ended, the difference SHALL be expressed as an amount above or below the baseline.

#### Scenario: Current week under the baseline

- **WHEN** the user views the week containing the current day and its total is below the typical-week figure
- **THEN** the difference is presented as what remains before the week reaches a typical one

#### Scenario: Current week over the baseline

- **WHEN** the user views the week containing the current day and its total is at or above the typical-week figure
- **THEN** the difference is presented as an amount above a typical week

#### Scenario: A completed week

- **WHEN** the user views a week that has already ended
- **THEN** the difference is presented as an amount above or below a typical week
- **AND** it is not presented as remaining headroom, whichever side of the baseline the week falls

### Requirement: A week with nothing recorded

Where the week on screen contains no expenses, Insights SHALL say so plainly rather than presenting an empty breakdown, a zero total without explanation, or a comparison against the baseline.

The empty state SHALL NOT be displayed before the week's figures have been read, so that a week containing expenses never briefly appears empty.

#### Scenario: An empty week

- **WHEN** the user views a week in which no expense was recorded
- **THEN** the destination states that nothing was recorded in that week
- **AND** no category breakdown and no comparison are shown
- **AND** week navigation remains available

#### Scenario: Figures are not yet read

- **WHEN** the user opens Insights or moves to another week and the week's figures have not yet been read
- **THEN** the empty state is not shown

### Requirement: Insights reflects expenses recorded elsewhere

Insights SHALL show the effect of every expense recorded, edited, deleted, or imported elsewhere in the application, without the user having to reload it.

#### Scenario: An expense is recorded and Insights is opened

- **WHEN** the user records an expense in the current week and then opens Insights
- **THEN** the week total, the category breakdown, and the comparison all account for that expense

#### Scenario: An expense is deleted

- **WHEN** the user deletes an expense that was the only one in its category for the week and then returns to Insights
- **THEN** that category no longer appears in the breakdown
- **AND** the week total is reduced by that expense's amount

#### Scenario: Expenses are imported

- **WHEN** the user imports expenses covering weeks before the one on screen and returns to Insights
- **THEN** the typical-week figure accounts for the imported weeks
