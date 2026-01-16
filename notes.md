# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component      | Backend endpoints                             | Database SQL |
| --------------------------------------------------- | ------------------      | -----------------                             | ------------ |
| View home page                                      |home.tsx                 |[GET] /                                        |              |
| Register new user<br/>(t@jwt.com, pw: test)         |register.tsx             |[POST] /api/auth                               |              |
| Login new user<br/>(t@jwt.com, pw: test)            |login.tsx                |[PUT] /api/auth                                |              |
| Order pizza                                         |menu.tsx & payment.tsx   |[GET] /api/order/menu & [POST] /api/order      |              |
| Verify pizza                                        |delivery.tsx             |[POST] /api/order; response from factory       |              |
| View profile page                                   |dinerDashboard.tsx       |[GET] /api/user/me                             |              |
| View franchise<br/>(as diner)                       |view.tsx                 |[GET] /api/franchise?page=0&limit=10&name=*    |              |
| Logout                                              |logout.tsx               |[DELETE] /api/auth                             |              |
| View About page                                     |about.tsx                |NONE                                           |              |
| View History page                                   |history.tsx              |[GET] /api/order                               |              |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |login.tsx                |[PUT] /api/auth                                |              |
| View franchise<br/>(as franchisee)                  |franchiseDashboard.ts    |[GET] /api/franchise/:userId                   |              |
| Create a store                                      |createStore.tsx          |[POST] /api/franchise/:franchiseId/store       |              |
| Close a store                                       |closeStore.tsx           |[DELETE] /api/franchise/:franchiseId           |              |
| Login as admin<br/>(a@jwt.com, pw: admin)           |login.tsx                |[PUT] /api/auth                                |              |
| View Admin page                                     |adminDashboard.tsx       |[GET] /api/franchise?page=0&limit=10&name=*    |              |
| Create a franchise for t@jwt.com                    |createFranchise.tsx      |[POST] /api/franchise                          |              |
| Close the franchise for t@jwt.com                   |closeFranchise.tsx       |[DELETE] /api/franchise/:franchiseId           |              |
