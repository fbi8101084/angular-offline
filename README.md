angular-offline
===================
### What's offline ?

1. 如果沒網路的狀態下，使用 $.offline 會自動存到 localStorage，
2. 路人: 那他換成 online 的時候會自動送出嗎？會，就是在第一次載入 plugin 的時候會自動去檢查 localStorage 有資料就送出，送出失敗就繼續保留成功就刪除 localStorage 的資料。
3. 然後預設每一分鐘 5s 會自動檢查 localStorage
4. 這是 angular 版本，用法請參考 index.html，之後會再補充文件

When you have no network, program will save data in localStorage automatically. Then it will resend XHR when check( setTimeout function ) network is fine or next time program initialize.


