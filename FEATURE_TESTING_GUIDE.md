
# 🧪 FEATURE TESTING GUIDE

## How to Test Each Feature

This guide will help you verify that all features are working correctly.

---

## 1. 🔍 LOCAL PROFILE SEARCH (Casa Adolfo)

### Steps to Test:
1. Open the app
2. Navigate to the **Social** tab (bottom navigation)
3. Tap the **Search icon** (magnifying glass) in the header
4. Type **"Casa Adolfo"** in the search box
5. Wait for results to appear

### Expected Result:
- Casa Adolfo should appear in the search results
- It should have a **"Local"** badge (green background)
- It should show the local's avatar/image
- Tapping on it should navigate to the local's profile

### If It Doesn't Work:
1. Check the console logs for:
   ```
   [SocialSearch v4.0] 🔍 Searching for: Casa Adolfo
   [SocialSearch v4.0] 📍 Found X locals matching query
   [SocialSearch v4.0] ✅ Valid local IDs with paid plans: [...]
   ```
2. Verify Casa Adolfo has an active subscription:
   - Go to Admin Panel → Gestionar Locales
   - Find Casa Adolfo
   - Check subscription status (should be "activa" with "premium" plan)

---

## 2. 💚 MOMENTO BORDER SYNCHRONIZATION

### Setup:
1. You need **two user accounts** for this test:
   - **User A**: Will post a momento
   - **User B**: Will view the momento

### Steps to Test:

#### Part 1: Post a Momento (User A)
1. Log in as **User A**
2. Go to **Social** tab
3. Tap the **+ icon** on your avatar in the momentos section
4. Upload an image
5. Post the momento

#### Part 2: View the Border (User B)
1. Log in as **User B**
2. Go to **Social** tab
3. Look at the momentos section at the top
4. **User A's avatar should have a GREEN NEON BORDER** ✅

#### Part 3: View the Momento (User B)
1. Still logged in as **User B**
2. Tap on **User A's avatar** (with green border)
3. View the momento
4. Close the momento viewer
5. **The green border should DISAPPEAR immediately** ✅

### Expected Behavior:
- Green border appears ONLY when there are UNVIEWED momentos
- Green border disappears IMMEDIATELY after viewing all momentos
- This happens in REAL-TIME (no need to refresh)

### If It Doesn't Work:
1. Check console logs for:
   ```
   [MiniFoodPlateAvatar] 🔍 Momento check: {
     userId: '...',
     totalMomentos: X,
     viewedCount: Y,
     hasUnviewed: true/false
   }
   [MiniFoodPlateAvatar] 🔄 Real-time view update: {...}
   ```
2. Verify the momento hasn't expired (24 hours)
3. Check that real-time subscriptions are working

---

## 3. 📱 LOCAL DETAILS MODAL

### Steps to Test:
1. Go to **Explorar** tab
2. Tap on any local card
3. The local details should open as a **MODAL**

### Expected Behavior:
- Modal does NOT reach the top of the screen (60px margin) ✅
- Modal has ROUNDED CORNERS at the top ✅
- You can see a SEMI-TRANSPARENT OVERLAY behind the modal ✅
- You can SWIPE DOWN to dismiss the modal ✅
- Modal appears OVER the previous screen (not replacing it) ✅

### Visual Reference:
```
┌─────────────────────────┐
│  [Previous Screen]      │ ← Visible behind overlay
│  ╔═══════════════════╗  │
│  ║ ╭─────────────╮   ║  │ ← Rounded corners
│  ║ │ Local Modal │   ║  │
│  ║ │             │   ║  │
│  ║ │   Content   │   ║  │
│  ║ │             │   ║  │
│  ║ │             │   ║  │
│  ║ ╰─────────────╯   ║  │
│  ╚═══════════════════╝  │
└─────────────────────────┘
```

### If It Doesn't Work:
- Check that you're navigating to `/detalle/local?localId=...`
- Verify `app/detalle/_layout.tsx` exists and has modal configuration
- Check Platform.OS for correct marginTop value

---

## 4. 👤 USER REDIRECTION

### Steps to Test:

#### Test 1: Click on Your Own Profile
1. Go to **Social** tab
2. Find one of YOUR OWN posts
3. Tap on YOUR avatar or username
4. **Should navigate to YOUR profile page** (/(tabs)/perfil) ✅

#### Test 2: Click on Another User's Profile
1. Go to **Social** tab
2. Find a post from ANOTHER USER
3. Tap on THEIR avatar or username
4. **Should navigate to THEIR public profile** (/perfil/usuario?userId=...) ✅

#### Test 3: Click in Search Results
1. Go to **Social** → **Search**
2. Search for a user
3. Tap on the user in results
4. If it's YOU → goes to your profile ✅
5. If it's ANOTHER USER → goes to their profile ✅

#### Test 4: Click in Likes List
1. Open any post with likes
2. Tap on the likes avatars/text
3. Modal opens with list of users who liked
4. Tap on a user:
   - If it's YOU → goes to your profile ✅
   - If it's ANOTHER USER → goes to their profile ✅

#### Test 5: Click on Mentions
1. Find a post with a mention (e.g., "@jorge")
2. Tap on the mention
3. If it's YOUR username → goes to your profile ✅
4. If it's ANOTHER USER → goes to their profile ✅

### Expected Behavior:
- Clicking on YOUR OWN username/avatar ALWAYS goes to YOUR profile
- Clicking on ANOTHER USER's username/avatar ALWAYS goes to THEIR profile
- This works in ALL locations: posts, search, likes, mentions

### If It Doesn't Work:
- Check console logs for navigation events
- Verify `user.id` is available in AuthContext
- Check that the comparison `user.id === clickedUserId` is working

---

## 5. ✏️ EDIT POST DESCRIPTION

### Steps to Test:

#### Test 1: Edit from Post Card (Feed)
1. Go to **Social** tab
2. Find one of YOUR OWN posts
3. Tap the **3-dot menu** (⋮) on the post
4. Select **"Editar descripción"**
5. Modal opens with current description
6. Edit the text
7. Tap **"Guardar"**
8. **Description should update immediately** ✅

#### Test 2: Edit from Post Details Page
1. Go to **Social** tab
2. Tap on one of YOUR OWN posts to open details
3. Tap the **3-dot menu** (⋮) in the header
4. Select **"Editar descripción"**
5. Modal opens with current description
6. Edit the text
7. Tap **"Guardar"**
8. **Description should update immediately** ✅

### Expected Behavior:
- Edit option ONLY appears on YOUR OWN posts ✅
- Modal shows current description ✅
- You can edit the TEXT (not the images) ✅
- Character counter shows X/2200 ✅
- Saving updates the description ✅
- `editado_at` timestamp is updated ✅

### If It Doesn't Work:
- Verify you're the post owner
- Check `canEdit` variable in console
- Verify `interactionLocalId` for local posts
- Check for error messages in console

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "Features not working at all"
**Solution:**
1. **Restart the app completely** (close and reopen)
2. **Clear app cache**: Settings → Clear Cache
3. **Rebuild the app**: `npm run dev` or `expo start --clear`

### Issue 2: "Search not finding Casa Adolfo"
**Solution:**
1. Verify Casa Adolfo exists in database
2. Check subscription status (must be "activa")
3. Check plan name (must be "estandar" or "premium")
4. Look at console logs for search query results

### Issue 3: "Momento border always showing"
**Solution:**
1. View ALL momentos from that user
2. Wait a few seconds for real-time sync
3. Check console logs for momento view updates
4. Verify real-time subscriptions are working

### Issue 4: "Modal appearing full screen"
**Solution:**
1. Check navigation path (must be `/detalle/local`)
2. Verify `_layout.tsx` has modal configuration
3. Check Platform.OS for correct marginTop
4. Restart app to apply layout changes

### Issue 5: "Edit option not appearing"
**Solution:**
1. Verify you're logged in
2. Check you're the post owner
3. Look for `canEdit` variable in console
4. Verify `user.id === post.autor_id`

---

## 📊 VERIFICATION CHECKLIST

Use this checklist to verify all features:

### Local Profile Search
- [ ] Search box appears when tapping search icon
- [ ] Typing "Casa Adolfo" shows results
- [ ] Casa Adolfo appears with "Local" badge
- [ ] Tapping Casa Adolfo opens local profile

### Momento Border Synchronization
- [ ] Green border appears on avatars with unviewed momentos
- [ ] Border disappears after viewing all momentos
- [ ] Border updates in real-time (no refresh needed)
- [ ] Border only shows for UNVIEWED momentos

### Local Details Modal
- [ ] Modal doesn't reach top of screen
- [ ] Modal has rounded corners at top
- [ ] Semi-transparent overlay visible behind
- [ ] Can swipe down to dismiss
- [ ] Modal appears over previous screen

### User Redirection
- [ ] Clicking own avatar/username goes to own profile
- [ ] Clicking other user's avatar/username goes to their profile
- [ ] Works in search results
- [ ] Works in post cards
- [ ] Works in post details
- [ ] Works in likes list
- [ ] Works in mentions

### Edit Post Description
- [ ] 3-dot menu appears on own posts
- [ ] "Editar descripción" option visible
- [ ] Modal opens with current description
- [ ] Can edit text (not images)
- [ ] Character counter shows X/2200
- [ ] Saving updates description
- [ ] Works in post card
- [ ] Works in post details page

---

## 🎯 FINAL VERIFICATION

If ALL checkboxes are checked, all features are working correctly! ✅

If some features are not working:
1. Check the specific troubleshooting section above
2. Look at console logs for error messages
3. Verify database data is correct
4. Restart the app and try again

**Remember:** Some features require specific conditions (e.g., momento border requires unviewed momentos, edit option requires being post owner).
