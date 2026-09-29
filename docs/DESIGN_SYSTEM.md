# Design System

## Direction

Read Buddy should feel calm, focused, and editorial rather than gamified. Use off-white page surfaces, white cards, deep emerald actions, mint accents, charcoal text, and subtle green-gray borders. Gradients are reserved for restrained emphasis, not page backgrounds or every card.

## Tokens

Semantic CSS variables live in `src/app/globals.css` and are mapped into Tailwind through `@theme inline`.

- `background` / `foreground`: page and primary text.
- `card` / `card-foreground`: raised surfaces.
- `primary` / `primary-foreground`: primary actions and current-reading emphasis.
- `secondary`: quiet controls and supporting surfaces.
- `muted` / `muted-foreground`: metadata and low-emphasis regions.
- `accent` / `accent-foreground`: selected states and gentle highlights.
- `border`, `input`, and `ring`: consistent control boundaries and focus.
- `chart-1` through `chart-5`: future analytics palette.
- `sidebar-*`: future desktop navigation without hardcoded feature colors.

Feature code uses semantic utilities such as `bg-card`, `text-muted-foreground`, and `border-border`. Do not introduce arbitrary emerald/gray Tailwind classes when a semantic role exists. Add a token only when a repeated semantic role is missing.

## Typography and shape

- Geist is the primary interface face; Geist Mono is limited to technical values.
- Use a clear type scale and sentence case. Avoid excessive uppercase; small labels may use restrained tracking.
- Default radius is 12px, with larger radii for major surfaces and smaller radii for compact controls.
- Shadows are subtle. Borders and spacing should do most hierarchy work.

## Components

Use shadcn/ui primitives installed into `src/components/ui`. Keep those primitives generic; assemble feature-specific components inside the owning feature. Use Lucide icons at consistent optical sizes and never use an icon without an accessible label or adjacent text when its meaning is not decorative.

Forms use React Hook Form only when client-side form state or multi-field validation justifies it. Zod owns runtime validation, and Server Actions revalidate independently of the browser.

## Responsive shell

- Desktop: persistent sidebar, compact header, and bounded main content.
- Mobile: compact header and reachable mobile navigation; no squeezed desktop sidebar.
- The future dashboard gives the current book the strongest visual hierarchy and keeps secondary analytics quiet.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Preserve visible keyboard focus via the semantic ring token.
- Use real headings, landmarks, labels, and buttons before ARIA.
- Target at least 44px touch areas for primary mobile controls.
- Respect `prefers-reduced-motion` and avoid motion as the only state signal.
- Charts require text summaries and cannot communicate by color alone.
