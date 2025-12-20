# 🎯 **BETA TESTING SCENARIOS**
*Structured test cases for beta testers*

## 🏠 **HOMEOWNER TEST SCENARIOS**

### **Scenario 1: First-Time User Experience**
**Goal:** Test the complete onboarding flow for homeowners

**Steps:**
1. **Download and Install**
   - Download app from TestFlight/Play Store link
   - ⏱️ Time how long installation takes
   - 📝 Note any confusing steps

2. **Account Creation**
   - Open app and select "Create Account"
   - Choose "Homeowner" role
   - Fill out profile information
   - Upload profile photo (optional)
   - 📝 Was anything unclear or confusing?

3. **Profile Setup**
   - Add your address/location
   - Set notification preferences
   - Explore account settings
   - 📝 Did you understand each option?

**Success Criteria:**
- [ ] Account created successfully
- [ ] Profile setup completed without confusion
- [ ] User understands their role and next steps

**Feedback Questions:**
- How long did this take? (goal: under 3 minutes)
- What was most confusing?
- What would you change about the signup process?

---

### **Scenario 2: Job Posting Flow**
**Goal:** Test the core job creation functionality

**Test Job:** "Fix leaky kitchen faucet"

**Steps:**
1. **Navigate to Job Posting**
   - Find and tap "Post Job" or similar button
   - 📝 Was it easy to find?

2. **Fill Job Details**
   - Title: "Fix leaky kitchen faucet"
   - Description: "Kitchen sink faucet has been dripping for a week. The drip is getting worse and needs professional repair."
   - Category: Select "Plumbing"
   - Budget: Set to $150
   - 📝 Were the form fields clear?

3. **Add Photos**
   - Try to add 2-3 photos (can be any photos)
   - Try to add a 4th photo (should hit limit)
   - 📝 Did photo upload work smoothly?

4. **Review and Post**
   - Review all job details
   - Submit the job
   - 📝 Was the confirmation clear?

**Success Criteria:**
- [ ] Job posted successfully
- [ ] Photo limit enforced properly (max 3)
- [ ] User understands what happens next

**Feedback Questions:**
- Would you post a real job using this process?
- What information was missing?
- How would you improve the photo upload?

---

### **Scenario 3: Contractor Discovery**
**Goal:** Test browsing and hiring contractors

**Steps:**
1. **Browse Available Contractors**
   - Look for "Find Contractors" or browse section
   - View contractor profiles
   - Look at ratings, reviews, and portfolios
   - 📝 Is the information helpful for decision-making?

2. **Job Bid Management** (if bids available)
   - View bids on your posted job
   - Compare different contractor offers
   - Read contractor messages/proposals
   - 📝 Can you easily compare options?

3. **Hire a Contractor**
   - Select a contractor/bid to accept
   - Start a conversation with them
   - 📝 Was the hiring process clear?

**Success Criteria:**
- [ ] Can browse and evaluate contractors effectively
- [ ] Bid comparison is straightforward
- [ ] Hiring process is intuitive

**Feedback Questions:**
- How would you choose between contractors?
- What information is missing from profiles?
- Would you feel confident hiring through this app?

---

### **Scenario 4: Communication & Job Management**
**Goal:** Test messaging and job tracking

**Steps:**
1. **Messaging System**
   - Send a message to your hired contractor
   - Try sending different message types (text, photo)
   - 📝 Does messaging feel natural?

2. **Job Progress Tracking**
   - Look for ways to track job status
   - Check for notifications or updates
   - 📝 Can you easily see job progress?

3. **Job Completion**
   - Mark job as completed (when appropriate)
   - Leave a review for the contractor
   - 📝 Was the completion process smooth?

**Success Criteria:**
- [ ] Messaging works reliably
- [ ] Job status is clear and trackable
- [ ] Completion process is straightforward

---

## 🔨 **CONTRACTOR TEST SCENARIOS**

### **Scenario 1: Contractor Onboarding**
**Goal:** Test contractor account setup and verification

**Steps:**
1. **Account Creation**
   - Create account and select "Contractor" role
   - Fill out business information
   - Add skills and service areas
   - 📝 Was the process appropriate for contractors?

2. **Profile Setup**
   - Add business description
   - Upload portfolio photos (3-5 images)
   - Set service radius/areas
   - Add certifications or licenses
   - 📝 Could you represent your business well?

**Success Criteria:**
- [ ] Contractor profile is comprehensive
- [ ] Business information fields are relevant
- [ ] Portfolio upload works smoothly

---

### **Scenario 2: Job Discovery & Bidding**
**Goal:** Test contractor job search and bidding

**Steps:**
1. **Browse Available Jobs**
   - Look for jobs in your area
   - Filter by category (try "Plumbing")
   - View job details and requirements
   - 📝 Are you finding relevant opportunities?

2. **Submit a Bid**
   - Choose a job that matches your skills
   - Write a compelling bid message
   - Set your price and timeline
   - Submit the bid
   - 📝 Was the bidding process professional?

3. **Bid Management**
   - View your active bids
   - Edit or withdraw a bid if possible
   - Track bid responses
   - 📝 Can you manage multiple bids easily?

**Success Criteria:**
- [ ] Job search is effective
- [ ] Bidding process feels professional
- [ ] Bid management is straightforward

---

### **Scenario 3: Job Execution**
**Goal:** Test contractor job management

**Steps:**
1. **Job Assignment** (if bid accepted)
   - Receive notification of job acceptance
   - Confirm job details with homeowner
   - Start job communication
   - 📝 Is the transition from bid to job clear?

2. **Progress Updates**
   - Send progress updates to homeowner
   - Share photos of work in progress
   - Update job status as appropriate
   - 📝 Can you keep homeowners informed easily?

3. **Job Completion**
   - Mark job as completed
   - Request payment release
   - Follow up on review process
   - 📝 Is the completion process professional?

**Success Criteria:**
- [ ] Job management tools are adequate
- [ ] Communication with homeowner is smooth
- [ ] Payment process is clear

---

## 🔄 **CROSS-ROLE SCENARIOS**

### **Scenario 1: End-to-End Job Flow**
**Goal:** Test complete job lifecycle (requires 2 testers)

**Homeowner steps:**
1. Post job: "Install ceiling fan in bedroom"
2. Wait for bids from contractors
3. Review and accept best bid
4. Communicate with contractor
5. Approve completed work
6. Process payment and leave review

**Contractor steps:**
1. Find and bid on ceiling fan job
2. Wait for homeowner response
3. If accepted, communicate details
4. Update progress and share photos
5. Mark job completed
6. Receive payment

**Success Criteria:**
- [ ] Complete workflow functions end-to-end
- [ ] Both sides understand their role
- [ ] Payment processing works correctly

---

### **Scenario 2: Problem Resolution**
**Goal:** Test how the app handles issues

**Test situations:**
1. **Communication Problems**
   - Try sending messages when offline
   - Test with poor internet connection
   - 📝 How does the app handle connectivity issues?

2. **Bid Disputes**
   - Contractor withdraws bid
   - Homeowner cancels job
   - 📝 Are cancellation processes clear?

3. **Payment Issues**
   - Test payment flow with test cards
   - Try different payment scenarios
   - 📝 Is payment security/escrow clear?

---

## 📱 **TECHNICAL TEST SCENARIOS**

### **Scenario 1: App Performance**
**Goal:** Test app under various conditions

**Tests:**
1. **Startup Performance**
   - Close and reopen app multiple times
   - ⏱️ Time app launch speed
   - 📝 Does it feel fast enough?

2. **Photo Upload**
   - Upload multiple photos at once
   - Try large image files
   - Test with poor internet
   - 📝 How does photo handling work?

3. **Offline Usage**
   - Use app without internet
   - Try to send messages offline
   - Return online and sync
   - 📝 What works offline vs. online?

### **Scenario 2: Device Integration**
**Goal:** Test platform-specific features

**Tests:**
1. **Notifications**
   - Receive push notifications
   - Test notification settings
   - 📝 Are notifications helpful and timely?

2. **Device Features**
   - Use camera for photos
   - Test location services
   - Try with different orientations
   - 📝 Does the app integrate well with your device?

---

## 📊 **FEEDBACK COLLECTION**

### **After Each Scenario**
Rate 1-5 stars:
- ⭐ Overall experience
- ⭐ Ease of use  
- ⭐ Feature completeness
- ⭐ Would you use this feature regularly?

### **Open Questions**
- What frustrated you most?
- What did you love?
- What's missing?
- Would you recommend this app?
- Any bugs or errors encountered?

### **Bug Reporting**
Use the in-app shake gesture or note:
- What you were trying to do
- What happened instead
- Your device and app version
- Screenshots if helpful

---

**🎯 Testing Goal:** We want to know if real people would actually use Mintenance to solve their home maintenance needs. Your honest feedback - both positive and negative - helps us build something truly useful!