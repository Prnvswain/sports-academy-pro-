# Parent Portal Database Schema Design

## Schema Updates Required

### 1. Update UserRole Enum
```prisma
enum UserRole {
  SUPER_ADMIN
  ACADEMY_ADMIN
  COACH
  PARENT  // NEW
}
```

### 2. Update NotificationType Enum
```prisma
enum NotificationType {
  DUE_FEE
  OVERDUE_FEE
  COACH_ABSENT
  SUBSCRIPTION_EXPIRY
  NEW_STUDENT
  ATTENDANCE_REMINDER
  PERFORMANCE_REMINDER
  ATTRIBUTE_REQUEST
  GENERAL
  // Parent-specific notifications
  DAILY_COACH_NOTE  // NEW
  ABSENCE_ALERT     // NEW
  ACHIEVEMENT_ADDED // NEW
  PAYMENT_CONFIRMED // NEW
  PLAN_EXPIRY_WARNING // NEW
  BATCH_CHANGE      // NEW
  COACH_ANNOUNCEMENT // NEW
  ACADEMY_ANNOUNCEMENT // NEW
}
```

### 3. Add Parent Model
```prisma
model Parent {
  parent_id      Int      @id @default(autoincrement())
  academy_id     Int
  name           String
  email          String
  phone          String
  password_hash  String
  is_active      Boolean  @default(true)
  last_login     DateTime?
  created_at     DateTime @-default(now())
  updated_at     DateTime @updatedAt

  academy           Academy              @relation(fields: [academy_id], references: [academy_id], onDelete: Cascade)
  student_links     ParentStudent[]
  notifications     ParentNotification[]
  activity_logs     ParentActivityLog[]

  @@unique([academy_id, email])
  @@unique([academy_id, phone])
  @@index([academy_id])
  @@map("parents")
}
```

### 4. Add ParentStudent Junction Table
```prisma
model ParentStudent {
  parent_student_id Int      @id @default(autoincrement())
  parent_id        Int
  student_id       Int
  academy_id       Int
  is_primary       Boolean  @default(true) // First child is primary
  linked_at        DateTime @default(now())
  created_at       DateTime @default(now())

  parent  Parent  @relation(fields: [parent_id], references: [parent_id], onDelete: Cascade)
  student Student @relation(fields: [student_id], references: [student_id], onDelete: Cascade)

  @@unique([parent_id, student_id])
  @@index([parent_id])
  @@index([student_id])
  @@index([academy_id])
  @@map("parent_students")
}
```

### 5. Update Student Model to Add Parent Link
```prisma
model Student {
  // ... existing fields ...
  parent_id Int? // NEW - Direct link to parent for quick access
  
  // ... existing relations ...
  parent_student_links ParentStudent[] // NEW
  parent               Parent?          @relation("StudentParent", fields: [parent_id], references: [parent_id])
  
  // ... existing indexes ...
  @@index([parent_id])
}
```

### 6. Add Parent Notification Model
```prisma
model ParentNotification {
  notification_id Int              @id @default(autoincrement())
  parent_id      Int
  academy_id     Int
  student_id     Int?             // Optional - for child-specific notifications
  type           NotificationType
  title          String
  body           String           @db.Text
  is_read        Boolean          @default(false)
  metadata       String?          @db.Text // JSON for additional data
  created_at     DateTime         @default(now())
  read_at        DateTime?

  parent  Parent  @relation(fields: [parent_id], references: [parent_id], onDelete: Cascade)

  @@index([parent_id, is_read])
  @@index([parent_id, created_at])
  @@index([student_id])
  @@map("parent_notifications")
}
```

### 7. Add Parent Activity Log Model
```prisma
model ParentActivityLog {
  log_id      Int      @id @default(autoincrement())
  parent_id   Int
  academy_id  Int
  action      String
  entity_type String?
  entity_id   Int?
  metadata    String?  @db.Text
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())

  parent  Parent  @relation(fields: [parent_id], references: [parent_id], onDelete: Cascade)

  @@index([parent_id, created_at])
  @@index([academy_id])
  @@map("parent_activity_logs")
}
```

### 8. Update Academy Model Relations
```prisma
model Academy {
  // ... existing fields ...
  parents           Parent[]              // NEW
  parent_notifications ParentNotification[] // NEW
  parent_activity_logs ParentActivityLog[] // NEW
  
  // ... existing relations ...
}
```

## Parent Account Auto-Creation Logic

When a student is enrolled:

1. Check if parent exists with same email AND phone in the academy
2. If exists → Link student to existing parent
3. If not exists → Create new parent account with:
   - Parent Name from student.parent_name
   - Email from student.parent_email
   - Phone from student.parent_phone
   - Auto-generated temporary password
   - Send welcome email with credentials
4. Link student to parent via ParentStudent table

## Multiple Children Linking Logic

When enrolling a new student:
1. Find parent by parent_email AND parent_phone
2. If found → Link new student to existing parent
3. If not found → Create new parent account
4. Set is_primary=true for first child, false for subsequent children

## Parent Portal Authentication Flow

1. **Login**: POST /api/v1/parent/login
   - Email/Phone + Password
   - Returns JWT token with parent_id
   - Updates last_login timestamp

2. **Verify Token**: Middleware to validate JWT
   - Checks token validity
   - Loads parent data
   - Ensures parent is active

3. **Password Reset**: POST /api/v1/parent/reset-password
   - Send reset code to email
   - Verify code
   - Update password

## Parent Portal API Routes Structure

```
/api/v1/parent/
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh-token
│   └── POST /reset-password
├── /dashboard
│   ├── GET /overview
│   ├── GET /quick-stats
│   └── GET /upcoming-sessions
├── /children
│   ├── GET /list
│   ├── GET /:student_id/details
│   └── POST /switch-child
├── /profile
│   ├── GET /:student_id
│   └── PUT /:student_id
├── /id-card
│   ├── GET /:student_id
│   └── GET /:student_id/download
├── /performance
│   ├── GET /:student_id/summary
│   ├── GET /:student_id/monthly
│   ├── GET /:student_id/charts
│   └── GET /:student_id/reports
├── /attendance
│   ├── GET /:student_id/summary
│   ├── GET /:student_id/calendar
│   └── GET /:student_id/history
├── /achievements
│   ├── GET /:student_id/list
│   └── GET /:student_id/:achievement_id
├── /account
│   ├── GET /:student_id/plan
│   └── GET /:student_id/fees
├── /fees
│   ├── GET /:student_id/history
│   └── GET /:student_id/receipt/:receipt_id
└── /notifications
    ├── GET /list
    ├── GET /unread-count
    ├── POST /:notification_id/read
    ├── POST /mark-all-read
    └── GET /filtered
```

## Security Considerations

1. **Child Access Restriction**: Parent can only access their linked children
2. **Protected Routes**: All parent routes require valid JWT
3. **Activity Logging**: Log all parent actions for audit
4. **Session Management**: Token refresh mechanism
5. **Rate Limiting**: Prevent brute force attacks
6. **Data Isolation**: Parents cannot see other students' data

## Frontend Structure

```
client/src/pages/parent/
├── ParentLayout.jsx
├── Dashboard/
│   ├── ParentDashboard.jsx
│   └── QuickStats.jsx
├── Profile/
│   ├── ParentProfile.jsx
│   └── StudentIDCard.jsx
├── Performance/
│   ├── PerformanceTracker.jsx
│   ├── PerformanceCharts.jsx
│   └── PerformanceReports.jsx
├── Attendance/
│   ├── AttendanceSummary.jsx
│   ├── AttendanceCalendar.jsx
│   └── AttendanceHistory.jsx
├── Achievements/
│   ├── AchievementsList.jsx
│   └── AchievementGallery.jsx
├── Account/
│   ├── PlanValidity.jsx
│   └── FeeInformation.jsx
├── Fees/
│   ├── FeeHistory.jsx
│   └── ReceiptView.jsx
└── Notifications/
    ├── NotificationCenter.jsx
    └── NotificationItem.jsx
```

## Parent Portal Features Breakdown

### 1. Dashboard
- Child switcher dropdown
- Quick stats cards (Attendance, Achievements, Sessions, Plan Validity)
- Upcoming sessions list
- Recent notifications
- Pending fees alert

### 2. Profile & ID Card
- Student photo display
- Complete student information
- QR code generation
- Download/Print ID card functionality
- PDF generation

### 3. Performance Tracker
- Monthly performance scores
- Coach ratings
- Skill development progress
- Fitness progress
- Training reports
- Chart visualizations (Progress, Attendance vs Performance, Skill Growth)
- PDF report download

### 4. Attendance
- Present/Absent/Late counts
- Calendar view with color coding
- Attendance history table
- Monthly attendance percentage

### 5. Achievements
- Certificates display
- Medals and trophies
- Tournament wins
- Competition participation
- Coach recognition
- Download certificates
- Achievement gallery

### 6. Account & Plan Validity
- Current plan details
- Plan start/end dates
- Days remaining
- Total fees, paid, pending
- Plan expiry warnings (7 days, 3_days, expired)

### 7. Fee History
- Payment history table
- Receipt number, date, amount, mode
- Collected by (Admin/Coach)
- Download receipt PDF
- Payment status

### 8. Notifications
- Bell icon with unread count
- Notification types:
  - Daily coach notes
  - Attendance updates
  - Absence alerts
  - Achievement added
  - Fee due reminder
  - Payment confirmation
  - Plan expiry reminder
  - Batch change
  - Coach announcement
  - Academy announcement
- Mark as read/unread
- Mark all read
- Filter by type
- Email copy for important notifications

## Mobile Responsiveness

- Responsive sidebar (collapsible on mobile)
- Touch-friendly navigation
- Optimized card layouts
- Mobile-optimized tables
- Bottom navigation for mobile (optional)
- Gesture support for charts

## Email Templates Required

1. **Parent Welcome Email**
   - Login portal link
   - Username (email/phone)
   - Temporary password
   - Instructions to change password

2. **Daily Coach Note Email**
   - Child name
   - Date
   - Coach notes
   - Performance highlights
   - Link to parent portal

3. **Absence Alert Email**
   - Child name
   - Date
   - Reason (if provided)
   - Link to attendance history

4. **Achievement Added Email**
   - Child name
   - Achievement type
   - Date
   - Link to achievements gallery

5. **Fee Due Reminder Email**
   - Child name
   - Due amount
   - Due date
   - Payment link

6. **Plan Expiry Warning Email**
   - Child name
   - Expiry date
   - Days remaining
   - Renewal instructions

## Implementation Priority

1. Database schema updates
2. Parent authentication backend
3. Parent account auto-creation
4. Multiple children linking
5. Basic API routes
6. Parent layout and navigation
7. Dashboard
8. Profile & ID Card
9. Performance Tracker
10. Attendance
11. Achievements
12. Account & Plan Validity
13. Fee History
14. Notifications
15. Mobile responsiveness
16. Security hardening
17. Testing
