import { createBrowserRouter, Route, RouterProvider, createRoutesFromElements } from "react-router-dom"
import { AuthProvider } from "./components/AuthProvider"
import Navigation from "./navigation"
import Home from "./pages/Home"
import Login from "./pages/Login"
import UserNotes from "./pages/UserNotes"
import ProtectedRoute from './components/ProtectedRoute';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './App.css'
import Register from "./pages/Register"
import AutoLoginHandler from "./components/AutoLoginHandler"

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auto-login" element={<AutoLoginHandler />} /> 
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      

      <Route path="/" element={<ProtectedRoute><Navigation /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/user-notes" element={<UserNotes />} />
      </Route>
    </>
  )
);

function App() {
 
  return (
    <AuthProvider>
      <DndProvider backend={HTML5Backend}>
    <RouterProvider router={router} />
    </DndProvider>
    </AuthProvider>
  );
}

export default App;
