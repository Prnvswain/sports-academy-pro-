# Sports Academy Admin API - Postman Collection

## Base URL
```
http://localhost:5000/api/v1
```

---

## 1. AUTHENTICATION

### 1.1 Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "admin@academy.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "name": "Academy Admin",
      "email": "admin@academy.com",
      "role": "academy_admin",
      "academy_id": 1
    }
  }
}
```

### 1.2 Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "newadmin@academy.com",
  "password": "password123",
  "name": "New Admin",
  "academy_id": 1,
  "role": "academy_admin"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 2,
      "name": "New Admin",
      "email": "newadmin@academy.com",
      "role": "academy_admin",
      "academy_id": 1
    }
  }
}
```

---

## 2. COACHES MANAGEMENT

### 2.1 Get All Coaches
```
GET /admin/coaches
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Coaches retrieved successfully",
  "data": [
    {
      "coach_id": 1,
      "academy_id": 1,
      "name": "John Doe",
      "specialization": "Football",
      "phone_number": "+919876543210",
      "email": "john@academy.com",
      "batches": []
    }
  ]
}
```

### 2.2 Create Coach
```
POST /admin/coaches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "specialization": "Football",
  "phone_number": "+919876543210",
  "email": "john@academy.com"
}

Response:
{
  "success": true,
  "message": "Coach created successfully",
  "data": {
    "coach_id": 1,
    "academy_id": 1,
    "name": "John Doe",
    "specialization": "Football",
    "phone_number": "+919876543210",
    "email": "john@academy.com"
  }
}
```

### 2.3 Update Coach
```
PUT /admin/coaches/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "specialization": "Advanced Football",
  "phone_number": "+919876543211",
  "email": "john.smith@academy.com"
}

Response:
{
  "success": true,
  "message": "Coach updated successfully",
  "data": {
    "coach_id": 1,
    "academy_id": 1,
    "name": "John Smith",
    "specialization": "Advanced Football",
    "phone_number": "+919876543211",
    "email": "john.smith@academy.com"
  }
}
```

### 2.4 Delete Coach
```
DELETE /admin/coaches/1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Coach deleted successfully",
  "data": {}
}
```

---

## 3. STUDENTS MANAGEMENT

### 3.1 Get All Students
```
GET /admin/students
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "student_id": 1,
      "academy_id": 1,
      "name": "Raj Kumar",
      "age": 15,
      "gender": "Male",
      "sport_id": 1,
      "batch_id": 1,
      "blood_group": "O+",
      "fees_status": "pending",
      "created_at": "2025-05-22T10:00:00Z"
    }
  ]
}
```

### 3.2 Create Student
```
POST /admin/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Raj Kumar",
  "age": 15,
  "gender": "Male",
  "sport_id": 1,
  "batch_id": 1,
  "blood_group": "O+",
  "fees_status": "pending"
}

Response:
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "student_id": 1,
    "academy_id": 1,
    "name": "Raj Kumar",
    "age": 15,
    "gender": "Male",
    "sport_id": 1,
    "batch_id": 1,
    "blood_group": "O+",
    "fees_status": "pending",
    "created_at": "2025-05-22T10:00:00Z"
  }
}
```

### 3.3 Update Student
```
PUT /admin/students/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Raj Kumar Singh",
  "age": 16,
  "gender": "Male",
  "sport_id": 1,
  "batch_id": 2,
  "blood_group": "O+",
  "fees_status": "paid"
}

Response:
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "student_id": 1,
    "academy_id": 1,
    "name": "Raj Kumar Singh",
    "age": 16,
    "gender": "Male",
    "sport_id": 1,
    "batch_id": 2,
    "blood_group": "O+",
    "fees_status": "paid",
    "created_at": "2025-05-22T10:00:00Z"
  }
}
```

### 3.4 Delete Student
```
DELETE /admin/students/1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Student deleted successfully",
  "data": {}
}
```

---

## 4. BATCHES MANAGEMENT

### 4.1 Get All Batches
```
GET /admin/batches
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Batches retrieved successfully",
  "data": [
    {
      "batch_id": 1,
      "academy_id": 1,
      "name": "U-15 Football",
      "coach_id": 1,
      "sport_id": 1,
      "timing": "15:00"
    }
  ]
}
```

### 4.2 Create Batch
```
POST /admin/batches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "U-15 Football",
  "coach_id": 1,
  "sport_id": 1,
  "timing": "15:00"
}

Response:
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "batch_id": 1,
    "academy_id": 1,
    "name": "U-15 Football",
    "coach_id": 1,
    "sport_id": 1,
    "timing": "15:00"
  }
}
```

### 4.3 Update Batch
```
PUT /admin/batches/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "U-16 Football",
  "coach_id": 2,
  "sport_id": 1,
  "timing": "16:00"
}

Response:
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "batch_id": 1,
    "academy_id": 1,
    "name": "U-16 Football",
    "coach_id": 2,
    "sport_id": 1,
    "timing": "16:00"
  }
}
```

### 4.4 Delete Batch
```
DELETE /admin/batches/1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Batch deleted successfully",
  "data": {}
}
```

---

## 5. COACH ATTENDANCE

### 5.1 Mark Coach Attendance
```
POST /admin/coach-attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "coach_id": 1,
  "date": "2025-05-22",
  "status": "present",
  "remarks": "On time"
}

Response:
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "attendance_id": 1,
    "coach_id": 1,
    "academy_id": 1,
    "date": "2025-05-22T00:00:00Z",
    "status": "present",
    "marked_by_admin_id": 5,
    "remarks": "On time",
    "created_at": "2025-05-22T10:00:00Z"
  }
}
```

### 5.2 Get Coach Attendance
```
GET /admin/coach-attendance/1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Attendance retrieved successfully",
  "data": [
    {
      "attendance_id": 1,
      "coach_id": 1,
      "academy_id": 1,
      "date": "2025-05-22T00:00:00Z",
      "status": "present",
      "marked_by_admin_id": 5,
      "remarks": "On time",
      "created_at": "2025-05-22T10:00:00Z"
    }
  ]
}
```

---

## 6. PAYMENTS MANAGEMENT

### 6.1 Get All Payments
```
GET /admin/payments
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": [
    {
      "payment_id": 1,
      "student_id": 1,
      "amount": 5000,
      "payment_date": "2025-05-22T00:00:00Z",
      "method": "online",
      "status": "completed"
    }
  ]
}
```

### 6.2 Create Payment
```
POST /admin/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_id": 1,
  "amount": 5000,
  "payment_date": "2025-05-22",
  "method": "online",
  "status": "completed"
}

Response:
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "payment_id": 1,
    "student_id": 1,
    "amount": 5000,
    "payment_date": "2025-05-22T00:00:00Z",
    "method": "online",
    "status": "completed"
  }
}
```

### 6.3 Update Payment Status
```
PATCH /admin/payments/1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "failed"
}

Response:
{
  "success": true,
  "message": "Payment updated successfully",
  "data": {
    "payment_id": 1,
    "student_id": 1,
    "amount": 5000,
    "payment_date": "2025-05-22T00:00:00Z",
    "method": "online",
    "status": "failed"
  }
}
```

---

## 7. REPORTS

### 7.1 Get Academy Report
```
GET /admin/report
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Report retrieved successfully",
  "data": {
    "totalCoaches": 5,
    "totalStudents": 50,
    "totalBatches": 10,
    "totalRevenue": 250000,
    "paidFees": 40,
    "pendingFees": 10
  }
}
```

---

## SETUP INSTRUCTIONS

### 1. Database Setup
Make sure your MySQL database is running with the correct connection string in `.env`

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Migrations
```bash
npx prisma migrate dev --name init
```

### 4. Start Server
```bash
npm start
```

### 5. Test in Postman
- Create a new Postman Collection
- Add the base URL: `http://localhost:5000/api/v1`
- First, call the Login endpoint to get a token
- Add the token to Authorization header in subsequent requests
- Test all endpoints

---

## ERROR HANDLING

All errors return this format:
```json
{
  "success": false,
  "message": "Error description",
  "data": {}
}
```

Common Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

---
