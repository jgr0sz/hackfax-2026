# Patriot Radar - Accessibility Quick Reference

## Keyboard Shortcuts Reference

### Navigation Shortcuts
| Shortcut | Function |
|----------|----------|
| `Tab` | Move to next interactive element |
| `Shift+Tab` | Move to previous interactive element |
| `Enter` | Activate button/link/submit form |
| `Space` | Activate button, toggle checkbox, select radio |
| `Arrow Keys` | Navigate radio groups, select dropdowns |

### Accessibility Hub Shortcuts
| Shortcut | Function |
|----------|----------|
| `Alt+A` | Toggle accessibility options panel |
| `Alt+1` | Toggle high contrast mode |
| `Alt+2` | Increase text size (+10%) |
| `Alt+3` | Decrease text size (-10%) |
| `Alt+4` | Reset all accessibility settings |

---

## Screen Reader Testing Quick Start

### For Windows Users:

**Using Narrator (Built-in):**
```
Windows + Ctrl + N → Start Narrator
Tab → Navigate through page
Narrator + arrow keys → Read content in detail
Narrator + H → Help menu
Alt+Tab → Switch applications
```

**Using NVDA (Free, Recommended):**
1. Download from https://www.nvaccess.org/
2. Double-click installer and follow setup
3. Start NVDA from Start menu
4. Use `Insert + key` for NVDA commands:
   - `Insert + F7` → Element list
   - `Insert + Down Arrow` → Read page continuously
   - `Insert + Left Arrow` → Read current line
   - `H` → List headings
   - `L` → List links

### What You Should Hear:

1. **Page Load:**
   - "Navigation region, navigation"
   - "Main, generic"
   - Page heading

2. **When Tabbing:**
   - Button labels: "Home, button"
   - Link labels: "Report an incident, link"
   - Form fields: "Username, edit text"
   - Required indicator: "Required"

3. **At Feed Items:**
   - "List of incident reports"
   - "List item: [Severity] severity at [Location]"
   - "Upvote button, [Count] upvotes"

---

## Testing Checklist

### Keyboard Navigation Test
- [ ] Page is fully navigable with Tab key only
- [ ] No keyboard traps (can always Tab out)
- [ ] Focus indicators visible (blue outline)
- [ ] Skip link visible on Tab
- [ ] Form submission works with Enter
- [ ] Buttons activate with Space or Enter

### Screen Reader Test
- [ ] Page title read on load
- [ ] Navigation marked and announced
- [ ] All buttons have clear labels
- [ ] All form labels associated with inputs
- [ ] Form submission feedback announced
- [ ] Required fields clearly marked
- [ ] Error messages announced
- [ ] Live updates announced (feed updates)

### Visual Accessibility Test
- [ ] Focus outlines clearly visible
- [ ] Colors not only way to convey info
- [ ] Text readable at 200% zoom
- [ ] Sufficient color contrast (4.5:1 or better)
- [ ] High contrast mode works

### Mobile/Touch Accessibility Test
- [ ] Touch targets ≥44x44 pixels
- [ ] Buttons clearly labeled
- [ ] Form fields properly sized
- [ ] Keyboard (on-screen) navigation works
- [ ] Accessibility hub accessible on mobile

---

## Site Features and Their Accessibility

### Navigation Bar
✅ Fully keyboard accessible  
✅ User status announced  
✅ Login/logout button clearly labeled  
✅ Admin link available when applicable  

### Home Page
✅ Live feed announces as list  
✅ Each incident announces severity and location  
✅ Vote buttons announce count  
✅ Report button directs to map  
✅ Status messages announced via live region  

### Report Form
✅ All inputs have associated labels  
✅ Required fields marked  
✅ Help text available to screen readers  
✅ Severity radio options grouped with fieldset/legend  
✅ Success/error messages announced  

### Map Page
✅ Form inputs accessible  
✅ Report submission announces results  
✅ Nearby incidents announced  
✅ Loading state announced  

### Login/Sign Up
✅ Form inputs properly labeled  
✅ Required fields clearly marked  
✅ Password requirements announced  
✅ Error/success messages announced  
✅ Links to other pages accessible  

### Reports List
✅ Reports presented as semantic list  
✅ Each report accessible via Tab  
✅ Severity and status announced  
✅ Loading and error states announced  

### Accessibility Hub
✅ Floating widget fully keyboard accessible  
✅ Alt+A toggle works globally  
✅ High contrast affects entire page  
✅ Text size applies site-wide  
✅ Settings persist through navigation  
✅ Shortcuts listed and accessible  

---

## Common Accessibility Testing Scenarios

### Scenario 1: Report an Incident (Keyboard Only)
1. Start at page load
2. Press Tab until "Report Incident" button is focused
3. Press Enter
4. You should be on the map page
5. Tab through form fields
6. Press Tab to "Submit Report" button
7. Press Space or Enter to submit
8. You should hear a success or error message

### Scenario 2: View Feed (Screen Reader)
1. Start screen reader (Narrator or NVDA)
2. Listen to initial page announcement
3. Navigate to "Live Report Feed" section
4. Screen reader should announce "List of incident reports"
5. Tab to first report
6. Hear status "Verified" or "Unverified"
7. Tab to vote button, hear current count
8. Wait 30 seconds for feed update
9. You should hear live region announce new reports

### Scenario 3: High Contrast Mode
1. Press Alt+A to open accessibility hub
2. Click "High Contrast" checkbox
3. Page should show high contrast colors (increased filter)
4. Text should be more readable
5. All interactive elements still visible
6. Close accessibility hub with Alt+A

### Scenario 4: Text Size Adjustment
1. Press Alt+A to open accessibility hub
2. Click "A+" button multiple times
3. Text should increase
4. Layout should adapt (no horizontal scroll)
5. Close accessibility hub
6. Reload page - settings should persist
7. Open accessibility hub, click "Reset" to restore

---

## Common Issues and Solutions

### Issue: Focus not visible
**Solution:** Look for blue outline (3px) around focused element. If you don't see it, check browser's dev tools to confirm `:focus-visible` is applied.

### Issue: Screen reader not reading content
**Solution:** Check if element has `aria-hidden="true"` (which hides from screen readers). Ensure `<label>` elements are associated with inputs via `htmlFor` attribute.

### Issue: Can't navigate with Tab
**Solution:** Use browser console to check if elements have `tabindex="-1"` (which removes from tab order). Verify no JavaScript is preventing Tab key.

### Issue: Submit button not working
**Solution:** Ensure you're using Space or Enter key (not just clicking). Check browser console for JavaScript errors.

### Issue: High contrast mode doesn't work
**Solution:** Close and reopen accessibility hub. Verify browser allows CSS filters. Try using Alt+1 shortcut instead of clicking.

---

## Files Modified for Accessibility

| File | Changes |
|------|---------|
| `src/App.js` | Nav landmark, skip link, focus management, AccessibilityHub |
| `src/index.css` | sr-only utility, focus-visible styling |
| `src/pages/HomePage.js` | Feed ARIA labels, live regions, vote button labels |
| `src/pages/MapPage.js` | Already semantic, enhanced with ARIA |
| `src/pages/LoginPage.js` | Form labels, error/success announcements |
| `src/pages/SignupPage.js` | Form labels, validation messages |
| `src/pages/ReportsPage.js` | Report list structure, item labels |
| `src/components/ReportForm.js` | Fieldset/legend, help text, validation |
| `src/components/AccessibilityHub.js` | **New component** - floating widget |

---

## For Developers: Adding More Accessible Features

### Template for Accessible Form Field
```javascript
<div>
  <label htmlFor="field-id" className="block text-sm font-semibold mb-2">
    Field Label <span className="text-red-500" aria-label="required">*</span>
  </label>
  <input
    id="field-id"
    name="field-name"
    type="text"
    required
    aria-required="true"
    aria-describedby="field-help"
    className="... focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
  />
  <div id="field-help" className="sr-only">
    Help text for screen readers
  </div>
</div>
```

### Template for Accessible Button
```javascript
<button
  onClick={handleClick}
  aria-label="Descriptive button label"
  className="... focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
>
  Button Text
</button>
```

### Template for Live Region (Announcements)
```javascript
<div 
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>
```

---

## Resources

- **WCAG 2.1 Level AA Compliance:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices Guide:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Keyboard Accessibility:** https://webaim.org/articles/keyboard/
- **MDN Accessibility Docs:** https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **React Accessibility Guide:** https://reactjs.org/docs/accessibility.html
- **Free Screen Reader:** https://www.nvaccess.org/

---

## Questions?

For more information about specific features, see `frontend/ACCESSIBILITY.md` for the comprehensive guide.

