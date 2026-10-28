import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AddFriend() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/explore', { replace: true });
  }, [navigate]);
  return null;
}

export default AddFriend;
