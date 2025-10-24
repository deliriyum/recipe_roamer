# Recipe Collection App - Design Guidelines

## Design Approach

**Reference-Based Approach** drawing inspiration from leading recipe platforms (Yummly, NYT Cooking, Paprika) with emphasis on visual appeal and mobile-first functionality. The design balances appetizing imagery with practical utility tools.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts) - clean, highly legible for ingredient lists and instructions
- **Display Font**: Playfair Display (Google Fonts) - elegant serif for recipe titles and headers
- **Hierarchy**:
  - Recipe titles: Playfair Display, 32px (mobile) / 48px (tablet+), semibold
  - Section headers: Inter, 20px, semibold, uppercase tracking
  - Body text (ingredients/instructions): Inter, 16px, regular, 1.6 line height
  - Metadata (time, servings): Inter, 14px, medium
  - Nutrition labels: Inter, 13px, regular

### Layout System
- **Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 for consistency
  - Component padding: p-4 (mobile), p-6 (tablet+)
  - Section margins: mb-6 (mobile), mb-8 (tablet+)
  - Card gaps: gap-4 (mobile), gap-6 (desktop)
  - Container padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)
- **Grid System**: 
  - Recipe cards: grid-cols-1 (mobile), grid-cols-2 (tablet), grid-cols-3 (desktop)
  - Single recipe view: max-w-3xl centered container
  - Form layouts: Single column with max-w-2xl

### Component Library

#### Navigation
- **Bottom Tab Bar** (Mobile Primary Navigation):
  - Fixed bottom position with 4 tabs: Recipes, Add Recipe, Import, Profile
  - Icons from Heroicons (outline for inactive, solid for active)
  - Height: h-16 with safe-area-inset-bottom
  - Label text: 11px below icons

- **Top Header Bar**:
  - Search icon and input toggle (right side)
  - Filter/sort controls (left side)
  - Height: h-14 with backdrop blur
  - Sticky position during scroll

#### Recipe Cards (Collection View)
- **Card Structure**:
  - Aspect ratio 4:3 recipe image
  - Gradient overlay on bottom third of image
  - Recipe title overlaid on gradient (18px, semibold)
  - Quick stats row below image: prep time, cook time, servings (icons + text)
  - Nutrition badge in top-right corner (calories per serving)
  - Rounded corners: rounded-xl
  - Shadow: shadow-md with hover lift effect

#### Recipe Detail View
- **Hero Image Section**:
  - Full-width image, aspect-ratio 16:9 (mobile) / 21:9 (desktop)
  - Back button (top-left) with blurred background circle
  - Action buttons (top-right): Share, Favorite, Edit - each with blurred background
  - Recipe title overlaid on gradient at bottom

- **Content Sections** (Sequential layout):
  1. **Quick Info Bar**: Time estimates, servings, difficulty level in pill badges
  2. **Servings Calculator**: Interactive stepper with - / + buttons, live ingredient quantity updates
  3. **Ingredients List**: Checkbox for each item, quantities in semibold, ingredient names in regular weight
  4. **Instructions**: Numbered steps with generous spacing (mb-4), optional step images
  5. **Nutrition Panel**: Card with grid layout showing calories, protein, carbs, fats, fiber
  6. **Tags/Categories**: Horizontal scroll of rounded pill tags
  7. **Notes Section**: User-added notes (if any)

#### Forms (Add/Edit Recipe)
- **Multi-Step Form Flow**:
  - Step indicator at top (1/4 progress dots)
  - Step 1: Image upload (large dropzone with preview)
  - Step 2: Basic info (title, description, times, servings)
  - Step 3: Ingredients (dynamic add/remove rows)
  - Step 4: Instructions (numbered step builder)
  - Navigation: Previous/Next buttons at bottom

- **Input Styling**:
  - Text inputs: h-12, rounded-lg, border focus states
  - Textareas: min-h-24, resize-y
  - Select dropdowns: Custom styled with chevron icon
  - Number inputs: Stepper buttons for servings, times

#### OCR Import Flow
- **Camera/Upload Interface**:
  - Large camera icon button or gallery selection
  - Image preview with cropping handles
  - Processing state: Animated pulse effect with "Analyzing recipe..." text
  - Result preview: Extracted text in editable form with confidence highlighting
  - Confirm/Edit buttons to proceed to recipe form

#### Import Schema Interface
- **Input Methods**:
  - URL input field with paste button
  - JSON text area with validation
  - File upload for .json files
  - Preview panel showing parsed recipe data
  - Import button with validation feedback

#### Search & Filter
- **Search Bar**:
  - Full-width input with search icon prefix
  - Voice search icon (optional)
  - Recent searches dropdown
  - Clear button when active

- **Filter Panel** (Slide-up modal):
  - Category checkboxes (Breakfast, Lunch, Dinner, Dessert, etc.)
  - Dietary filters (Vegetarian, Vegan, Gluten-free, etc.)
  - Cooking time slider
  - Difficulty level selector
  - Apply/Clear buttons at bottom

#### Empty States
- Illustration or icon (large, centered)
- Friendly message text
- Action button (e.g., "Add Your First Recipe")

### Images

**Image Strategy**: Food imagery is central to the experience.

1. **Hero/Featured Images**:
   - Recipe detail pages: Full-width, high-quality food photography
   - Collection view cards: Appetizing close-ups or styled shots
   - Import success: Celebratory food illustration

2. **Placeholder Strategy**:
   - Use gradient backgrounds with utensil icons for recipes without images
   - Provide camera prompt overlays for image upload zones

3. **Image Placement**:
   - Every recipe card includes an image (required)
   - Recipe detail hero (required)
   - Optional step-by-step instruction images
   - OCR upload preview area
   - Empty state illustrations

### Interactive Components

**Servings Calculator**:
- Circular stepper design with - and + buttons
- Center display shows current serving count
- Real-time ingredient quantity animation on change
- Haptic feedback on mobile

**Checkboxes** (Ingredients):
- Large touch targets (h-6 w-6)
- Strikethrough animation when checked
- Persist state during session

**Floating Action Button** (Add Recipe):
- Fixed bottom-right position
- Circular, large (h-14 w-14)
- Plus icon from Heroicons
- Elevated shadow

### Micro-Interactions
- Card press: Subtle scale-down (scale-98)
- Checkbox toggle: Bounce animation
- Servings update: Number count-up animation
- Image upload: Progress ring
- Pull-to-refresh: Custom food-themed loader

### Accessibility
- Minimum touch target: 44px x 44px
- ARIA labels on all interactive elements
- Keyboard navigation support for web version
- High contrast mode support
- Screen reader optimized labels for nutrition data

### Mobile Optimization
- Thumb-zone navigation (bottom tabs)
- Swipe gestures: Swipe between recipe steps, swipe to delete in lists
- Safe area insets for notched devices
- Optimized image loading with progressive JPEGs
- Offline capability indicators

This design creates a delightful, food-focused mobile experience that balances visual appeal with practical cooking functionality.