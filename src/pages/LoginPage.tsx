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
  const [selectedRole, setSelectedRole] = useState<
    "client" | "designer" | "admin" | "developer" | "legalteam" | "superadmin" | "manager" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleVerifyEmail = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!selectedRole) {
      setError("Please select a correct role.");
      return;
    }

    try {
      // For Employee Portal, check for designer, developer, or legalteam roles
      let rolesToCheck: string[] = [];
      if (selectedRole === "designer") {
        rolesToCheck = ["designer", "developer", "legalteam"];
      } else {
        rolesToCheck = [selectedRole];
      }

      // Check if user exists with any of the allowed roles
      let userFound = false;
      let actualRole = "";

      for (const role of rolesToCheck) {
        const q = query(
          collection(db, "allowedUsers"),
          where("email", "==", email.trim().toLowerCase()),
          where("role", "==", role)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          userFound = true;
          actualRole = role;
          break;
        }
      }

      if (userFound) {
        // Update selectedRole to the actual role found
        setSelectedRole(actualRole as any);
        setIsVerified(true);
      } else {
        setError(
          "Email and role mismatch or not allowed. Please contact admin."
        );
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Email verification failed:", error);
      setError("Something went wrong during email verification.");
    }
  };

  const handleGoogleLogin = async () => {
    if (!selectedRole || !email) return;
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
          role: selectedRole,
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
          {!selectedRole ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setSelectedRole("client")}
              >
                Client Portal
              </Button>
              <Button
                className="w-full"
                onClick={() => setSelectedRole("designer")}
              >
                Employee Portal
              </Button>
              <Button
                className="w-full"
                onClick={() => setSelectedRole("admin")}
              >
                Admin Portal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedRole(null);
                      setEmail("");
                      setError("");
                      setIsVerified(false);
                    }}
                  >
                    ← Back to Role Selection
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleGoogleLogin}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading
                      ? "Signing in..."
                      : `Sign in as ${selectedRole} using Google`}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedRole(null);
                      setEmail("");
                      setError("");
                      setIsVerified(false);
                    }}
                  >
                    ← Back to Role Selection
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
