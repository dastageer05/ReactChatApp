import { useEffect } from "react";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import Login from "./components/login/Login";
import Notification from "./components/notification/notification";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


const App = () => {
 
  const {currentUser, isLoading, fetchUserInfo} = useUserStore();
  const {chatId} = useChatStore();

  useEffect(() =>{
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });

    return ()=>{
      unSub()
    }
  }, [fetchUserInfo]);

  if (isLoading) return <div className="loading">Loading...</div>
  return (
    <Router>
      <div className="container">
        {currentUser ? (
          <Routes>
            <Route path="/home" element={<List />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/detail" element={<Detail />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
        <Notification />
      </div>
    </Router>
  );
};

export default App;