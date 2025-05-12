import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AutoLoginHandler() {
  const navigate = useNavigate();

useEffect(() => {
  const moodleId = new URLSearchParams(window.location.search).get('id');

  if (!moodleId) return;

  const initUser = async () => {
    try {
      await axios.get(`http://localhost:4000/api/auto-login/${moodleId}`, {
        withCredentials: true,
      });
      
      navigate('/home');
    } catch (err) {
      console.error("❌ Auto-login failed:", err.response?.data || err.message);
    }
  };

  initUser();
}, [navigate]);

  return null;
}
