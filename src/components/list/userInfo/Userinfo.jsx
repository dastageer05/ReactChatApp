import React from 'react'
import "./userInfo.css"
import {useUserStore} from "../../../lib/userStore"
import { useNavigate } from 'react-router-dom';

function Userinfo() {

  const {currentUser} = useUserStore();
  const navigate = useNavigate();

  const handleEditClick = () => {
    navigate("/detail"); // Update with the correct path to Detail.jsx
  };

  return (
     <div className='userInfo'>
      <div className="user">
        <img src={currentUser.avatar || "./avatar.png"} alt="" />
        <h2>{currentUser.username}</h2>
      </div>
      <div className="icons">
        <img src="./more.png" alt="More options" />
        <img src="./edit.png" alt="Edit user details" onClick={handleEditClick} />
      </div>
    </div>
  )
}

export default Userinfo