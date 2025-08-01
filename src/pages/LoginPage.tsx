import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [userRole, setUserRole] = useState<
    "client" | "designer" | "developer" | "legalteam" | "admin" | "manager" | null
  >(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleVerifyEmail = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    try {
      const q = query(
        collection(db, "allowedUsers"),
        where("email", "==", email.trim().toLowerCase())
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        setUserRole(userData.role);
        setUserDepartment(userData.department || null); // 👈 Add this
        setIsVerified(true);
      } else {
        setError("Email not found or not allowed. Please contact admin.");
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Email verification failed:", error);
      setError("Something went wrong during email verification.");
    }
  };

  const handlePortalClick = () => {
    setShowGoogleLogin(true);
  };

  const handleGoogleLogin = async () => {
    if (!userRole || !email) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email,
          role: userRole,
          department: userDepartment || null,
          createdAt: new Date().toISOString(),
        });
      }

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err.message);
      alert("Google login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setError("");
    setIsVerified(false);
    setUserRole(null);
    setUserDepartment(null);
    setShowGoogleLogin(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login Portal</CardTitle>
          <p className="text-gray-600">
            Choose your portal and verify your email
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isVerified ? (
            <>
              <Input
                placeholder="Enter your email to verify"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                className="w-full"
                onClick={handleVerifyEmail}
                disabled={!email.trim()}
              >
                Verify Email
              </Button>
            </>
          ) : !showGoogleLogin ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600 text-center">
                Email verified successfully!
              </p>
              <Button
                className="w-full"
                onClick={handlePortalClick}
              >
                {userRole === "client" && "Client Portal"}
                {userRole === "designer" && "Designer Portal"}
                {userRole === "developer" && "Developer Portal"}
                {userRole === "legalteam" && "Legal Team Portal"}
                {userRole === "manager" && "Manager Portal"}
                {userRole === "admin" && "Admin Portal"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                ← Back to Email Verification
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={handleGoogleLogin}
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : `Sign in as ${userRole} using Google`}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                ← Back to Email Verification
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
