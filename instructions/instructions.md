# Project Overview
This project is a web application for tracking trailer locations in a transport company yard using GPS coordinates. The application is built using React and Supabase, and is deployed on Vercel. You will make sure that this application looks modern and responsive, and that it is easy to use. The application should have the following features: 

# Core Functionality
## 1. User Authentication
- Login with email and password
- Logout
## 2. User Management
- Create a new user (only admin can do this)
    - Click on the "Create New User" button
    - Enter the user's details
        - First Name
        - Last Name
        - Email
        - Password
        - Role
            - Admin
            - User
        - Status
            - Active
            - Inactive
- Edit a user (only admin can do this)
    - Click on the "Edit User" button
    - Edit the user's details
## 3. Unit Management
- Create a new unit (trailer or vehicle)
    - Click on the "Create New Unit" button
    - Enter the unit's details, 
        - Unit Number
        - Licence Number
        - Serial Number
        - Unit Type
            - Trailer - Curtainsider
            - Trailer - DD Curtainsider
            - Trailer - Flatbed
            - Trailer - Box Van
            - Trailer - DD Box Van
            - Trailer - Reefer
            - Trailer - DD Reefer
            - Trailer - Chassiss
            - Vehicle - Tractor Unit
            - Vehicle - Van
            - Vehicle - Semi
        - Manufacturer
        - Year
        - Model
        - Parking Location
        - RAG Status
            - Red - RAG 1
            - Amber - RAG 2
            - Green - RAG 3
        - Comments
    - Save the unit
- Edit a unit (only admin can do this)
    - Click on the "Edit Unit" button
    - Edit the unit's details
- Delete a unit (only admin can do this)
    - Click on the "Delete Unit" button
    - Confirm the deletion
- Search for a unit
    - Click on the "Search" button
    - Enter the unit number
    - Show the unit details
- View all units
    - Click on the "View All Units" button
    - Show a list of all units
- Batch unit upload
    - Click on the "Batch Upload" button
    - Option to download a template, create template by using the unit details
    - Upload a CSV file
    - Show feedback message if successful or error
## 4. Record Location
- Search for the unit
- Show the unit details
- Click on the "Record Location" button
- Get current GPS location accurately
- Show the current location on a map
- Option to input notes against the location
- Save the location
- Show feedback message if successful or error
## 5. Find Unit
- Search for a unit
- Show the unit details
    - Unit Number
    - Licence Number
    - Serial Number
    - Unit Type
    - Manufacturer
    - RAG Status
    - Location notes
- When clicked on the found unit
    - Show the current location on a map
    - Option to open the location in Google Maps
    - Option to show a QR code so when scanned by a mobile device, the location can be opened in Google Maps
    - Option to view the location history
        - Show date and time last updated
        - Show who updated the location


