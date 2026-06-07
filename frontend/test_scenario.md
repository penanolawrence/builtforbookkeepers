## Scenario Analysis: globalIdx Safety Issue

**Setup:**
1. Server has 3 accounts (indices 0, 1, 2)
2. User adds a new account → draft now has 4 items (new one at index 3)
3. User clicks expand on Income section

**Problem Flow:**
1. `income = draft.filter((a) => a.type === 'income' && !a.isSystemManaged)` 
   - New account matches this filter
   
2. `CoaSection` renders filtered accounts: `{accounts.map((a) => getIdx(a))}`
   - For the new account: `globalIdx(newAccount) = draft.indexOf(newAccount)`
   - This will return the correct index (3) IF indexOf works

3. BUT: When a NEW account is added:
   - `{ id: '', code: '', name: 'New Account', type, isSystemManaged: false, isActive: true }`
   - Object reference is NEW
   - indexOf() checks REFERENCE equality, not value equality
   
**CRITICAL BUG:** indexOf will return -1 for the new account object if it's not the exact same reference!

**Why it "works" in current code:**
- The new account object IS stored in draft
- So indexOf finds it... but this is fragile
- If the account was reconstructed/remapped anywhere, indexOf fails

**Safer approach:**
- Use a stable key instead of indexOf
- Track draft items by unique id + position
