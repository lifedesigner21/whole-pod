import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    "developer" | "designer" | "legalteam" | null
  >(null);
  const [selectedDepartment, setSelectedDepartment] = useState<
    "development" | "designing" | "legal" | null
  >(null);
  const [isManager, setIsManager] = useState(false);
  const [showEmailStep, setShowEmailStep] = useState(false);
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
      setError("Please select a role.");
      return;
    }

    if (!selectedDepartment) {
      setError("Please select a department.");
      return;
    }

    try {
      const q = query(
        collection(db, "allowedUsers"),
        where("email", "==", email.trim().toLowerCase()),
        where("role", "==", selectedRole)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
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
    if (!selectedRole || !selectedDepartment || !email) return;
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
          department: selectedDepartment,
          isManager: isManager,
          isSuperadmin: false, // Only manually set in Firestore
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
          {!showEmailStep ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Role</label>
                <Select onValueChange={(value) => setSelectedRole(value as "developer" | "designer" | "legalteam")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="legalteam">Legal Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Department</label>
                  <Select onValueChange={(value) => setSelectedDepartment(value as "development" | "designing" | "legal")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="designing">Designing</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedRole && selectedDepartment && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isManager" 
                    checked={isManager}
                    onCheckedChange={(checked) => setIsManager(checked as boolean)}
                  />
                  <label htmlFor="isManager" className="text-sm font-medium">
                    I am a department manager
                  </label>
                </div>
              )}

              {selectedRole && selectedDepartment && (
                <Button
                  className="w-full"
                  onClick={() => setShowEmailStep(true)}
                >
                  Continue
                </Button>
              )}
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
                      setShowEmailStep(false);
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
                      setShowEmailStep(false);
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
