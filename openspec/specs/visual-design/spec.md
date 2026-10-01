## Purpose

Defines the visual system every destination shares: the colour roles and the contrast they must hold in both the light and the dark appearance, the type scale including how monetary figures are set, the rule conventions that give the app its ledger character, and the motion policy. Individual destinations decide what to show; this capability decides how it looks when they show it.

## Requirements

### Requirement: Colour roles are defined once for both appearances

The app SHALL define a single set of named colour roles — page background, raised surface, primary text, secondary text, rule, accent, and danger — and SHALL supply a value for every role in both the light and the dark appearance. Screens SHALL take colour only from these roles.

The accent role SHALL be reserved for interactive elements and SHALL NOT be used to convey the direction or the magnitude of an amount. Every amount the app records is money spent, so a colour that reads as gain or loss would assert a distinction the data does not make.

#### Scenario: Every role resolves in both appearances

- **WHEN** the app renders in either the light or the dark appearance
- **THEN** every colour role resolves to a defined value
- **AND** no screen renders a colour that is not one of the roles

#### Scenario: Text contrast in both appearances

- **WHEN** the app renders in either appearance
- **THEN** primary text and secondary text each meet a contrast ratio of at least 4.5:1 against the background and the surface they are placed on
- **AND** text placed on the accent meets a contrast ratio of at least 4.5:1 against it

#### Scenario: A large filled control does not overpower the page

- **WHEN** either appearance renders a control whose fill uses the accent and whose area exceeds 40 by 40 CSS pixels
- **THEN** that fill has a relative luminance of at most 0.45
- **AND** its contrast against the page background is at least 3:1

The luminance ceiling keeps a large accent-filled control — the add button above all — from becoming the brightest object on the screen, which is what a light, saturated accent does on a dark ground.

The ceiling constrains lightness only, deliberately. A primary action reads as primary through the chroma of its fill, so a rule tight enough to also suppress saturation would make every compliant accent look passive; an earlier 0.35 ceiling did exactly that and was raised.

### Requirement: Monetary figures are set in aligned tabular figures

The app SHALL provide a distinct type role for monetary figures. Every amount the app displays — entry amounts, day totals, week totals, and amounts shown during an import — SHALL use that role.

Figures in that role SHALL be rendered with digits of uniform width, so that amounts stacked vertically align digit for digit regardless of which digits they contain. Where amounts appear in a list, they SHALL be aligned to a common right edge.

#### Scenario: Amounts of differing digits align

- **WHEN** a list displays amounts whose digits differ in shape, such as one containing only the digit 1 and another containing only the digit 8
- **THEN** the two amounts occupy the same horizontal positions per digit place
- **AND** their right edges coincide

#### Scenario: Amounts share one treatment across screens

- **WHEN** an amount is displayed on any screen
- **THEN** it is set in the monetary type role
- **AND** no amount is displayed in the ordinary body role

### Requirement: The currency symbol marks totals, not entries

An individual recorded amount SHALL be displayed without the currency symbol. A summed amount — a day total, a week total, or an import total — SHALL be displayed with it.

The app records a single currency, so repeating its symbol on every entry adds no information; carrying it on sums is what distinguishes a total from the entries above it.

#### Scenario: Entry and total in the same view

- **WHEN** the user views a day group containing recorded expenses
- **THEN** each entry's amount is shown without the currency symbol
- **AND** the day's total is shown with it

#### Scenario: Amount being entered or edited

- **WHEN** the user types an amount into a form field
- **THEN** the field's contents contain no currency symbol
- **AND** the value the user typed is preserved exactly as entered

### Requirement: Rules carry ledger meaning

The app SHALL distinguish two weights of horizontal rule: a hairline, which separates peers or sets a group's heading off from the entries under it, and a heavier closing rule, which marks a set of entries as closed beneath their sum.

The closing rule SHALL appear at most once in any view and SHALL NOT be used decoratively. Where a view contains more than one level of sum, it SHALL mark only the outermost — a mark used at every level marks nothing.

The two SHALL differ by weight and colour rather than by count. A rule drawn as two thin parallel lines is not distinguishable from a rendering artefact at typical screen densities, and a mark that invites the question "is that a bug?" cannot carry meaning.

A view SHALL NOT stack more than two horizontal divisions in immediate succession; where a control's own border already separates it from what follows, no further rule is drawn between them.

The app SHALL additionally define a third form, the **measure rule**, whose length carries a magnitude rather than a boundary. A measure rule spans a fraction of the available width equal to the fraction its value is of the largest value in the same group, so that the longest measure in a group runs the full width. It is the app's chart vocabulary: quantity is shown by drawing the ledger's own rule to length, not by introducing a graphical form the rest of the app does not use.

A measure rule SHALL be visually distinguishable from both structural rules, so that a measure is never mistaken for a separator or for a closing rule. A measure rule SHALL NOT be treated as a structural division: where rows carry measure rules, no hairline separator SHALL additionally be drawn between those rows, since the measure already occupies that position.

A measure rule SHALL NOT be the only carrier of its value. Every value a measure rule draws SHALL also be present as a figure in the monetary type role, and the measure itself SHALL be hidden from assistive technology, which reads the figures.

A measure rule representing a non-zero value SHALL be drawn at a visible minimum length, so that a small value reads as small rather than as absent.

A measure rule MAY be crossed by a **marker**: a short perpendicular rule placed at the position a reference value would occupy on the same scale. The marker states whether the measure falls short of or passes that reference by position alone, without colour. At most one marker SHALL be placed on a measure rule.

#### Scenario: A total closing its entries

- **WHEN** the user views a set of entries together with the sum of those entries
- **THEN** the closing rule separates the sum from the entries it closes
- **AND** that rule is visibly heavier than the hairline used between peers

#### Scenario: Divisions do not accumulate

- **WHEN** any screen renders its heading area
- **THEN** no more than two horizontal divisions appear in immediate succession
- **AND** no rule is drawn directly against the border of an adjacent bordered element

#### Scenario: Measures drawn to proportion

- **WHEN** a view draws a group of measure rules for a set of values
- **THEN** the measure for the largest value spans the full available width
- **AND** each other measure spans that width in the same proportion as its value bears to the largest
- **AND** a measure for a non-zero value is drawn at a visible length however small that value is

#### Scenario: A measure is not mistaken for a separator

- **WHEN** a view renders rows carrying measure rules
- **THEN** each measure is visually distinguishable from the hairline and from the closing rule
- **AND** no additional hairline separator is drawn between those rows

#### Scenario: The figure carries the value, not the rule

- **WHEN** a measure rule is displayed
- **THEN** its value is also displayed as a figure in the monetary type role
- **AND** assistive technology reads the figure and does not announce the measure

#### Scenario: A measure marked against a reference

- **WHEN** a measure rule is drawn together with a reference value on the same scale
- **THEN** a single perpendicular marker is placed at the reference value's position
- **AND** whether the measure falls short of or extends past the reference is apparent from position alone, in either appearance

### Requirement: Motion is purposeful and respects the reduced-motion preference

The app SHALL animate a transition only where the animation communicates the relationship between what was on screen and what replaces it. Decorative animation SHALL NOT be added.

When the browser reports a preference for reduced motion, the app SHALL substitute an instant change or a cross-fade for any positional animation, and SHALL NOT omit the resulting state.

#### Scenario: Reduced motion is enabled

- **WHEN** the browser reports a preference for reduced motion and the user performs an action that would otherwise animate
- **THEN** the resulting state is displayed without positional animation
- **AND** the outcome of the action is identical to the outcome with animation enabled
