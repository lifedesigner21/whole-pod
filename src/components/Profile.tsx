import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const Profile: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    company: "",
    location: "",
    about: "",
    aadharNumber: "",
    panNumber: "",
    emergencyContact: "",
    permanentAddress: "",
    residentialAddress: "",
    dateOfBirth: "",
    expertise: [] as string[],
    gstNo: "",
  });

  const [newExpertise, setNewExpertise] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setFormData((prev) => ({
          ...prev,
          ...userData,
          expertise: userData.expertise || [],
        }));
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise)) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()],
      }));
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((e) => e !== item),
    }));
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...formData,
          uid: user.uid,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Generates a color from a string (hash-style)
  function getColorFromString(name: string) {
    const colors = [
      "#4F46E5", // Indigo
      "#10B981", // Green
      "#F59E0B", // Amber
      "#EF4444", // Red
      "#6366F1", // Blue
      "#EC4899", // Pink
      "#14B8A6", // Teal
      "#8B5CF6", // Violet
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  return (
    <Card className="max-w-5xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      {formData.name && (
        <div className="md:col-span-2 flex justify-start ml-4">
          <div
            className={`w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl font-bold shadow-md`}
            style={{
              backgroundColor: getColorFromString(formData.name),
            }}
          >
            {formData.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex justify-end pt-1">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go Back to Dashboard
          </Button>
        </div>
        {/* Name */}
        <div>
          <Label>Name</Label>
          <Input name="name" value={formData.name} onChange={handleChange} />
        </div>

        {/* Email */}
        <div>
          <Label>Email</Label>
          <Input name="email" value={formData.email} readOnly />
        </div>

        {/* Role */}
        <div>
          <Label>Role</Label>
          <Input name="role" value={formData.role} readOnly />
        </div>

        {/* Phone */}
        <div>
          <Label>Phone</Label>
          <Input name="phone" value={formData.phone} onChange={handleChange} />
        </div>

        {/* Company */}
        <div>
          <Label>Company</Label>
          <Input
            name="company"
            value={formData.company}
            onChange={handleChange}
          />
        </div>

        {/* Location */}
        <div>
          <Label>Location</Label>
          <Input
            name="location"
            value={formData.location}
            onChange={handleChange}
          />
        </div>

        {/* GST No */}
        {
          !["admin", "superadmin", "manager", "designer", "developer", "legalteam"].includes(userRole || "") && (

        <div>
          <Label>GST No</Label>
          <Input
            name="gst"
            value={formData.gstNo}
            onChange={handleChange}
          />
        </div>
          )
        }

        {/* Aadhar Number */}
        <div>
          <Label>Aadhar Number</Label>
          <Input
            name="aadharNumber"
            value={formData.aadharNumber}
            onChange={handleChange}
          />
        </div>

        {/* PAN Number */}
        <div>
          <Label>PAN Number</Label>
          <Input
            name="panNumber"
            value={formData.panNumber}
            onChange={handleChange}
          />
        </div>

        {/* Emergency Contact */}
        <div>
          <Label>Emergency Contact</Label>
          <Input
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleChange}
          />
        </div>

        {/* Permanent Address */}
        <div>
          <Label>Permanent Address</Label>
          <Input
            name="permanentAddress"
            value={formData.permanentAddress}
            onChange={handleChange}
          />
        </div>

        {/* Residential Address */}
        <div>
          <Label>Residential Address</Label>
          <Input
            name="residentialAddress"
            value={formData.residentialAddress}
            onChange={handleChange}
          />
        </div>

        {/* Date of Birth */}
        <div>
          <Label>Date of Birth</Label>
          <Input
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
        </div>

        {/* About */}
        <div className="md:col-span-2">
          <Label>About</Label>
          <textarea
            name="about"
            value={formData.about}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>

        {/* Expertise */}
        {!["admin", "superadmin", "manager", "client"].includes(userRole || "") && (
          <div className="md:col-span-2">
            <Label>Expertise</Label>
            <div className="flex gap-2">
              <Input
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                placeholder="Add your expertise in"
              />
              <Button type="button" onClick={handleAddExpertise}>
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.expertise.map((exp, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded flex items-center gap-1"
                >
                  {exp}
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => handleRemoveExpertise(exp)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <Button onClick={handleSave} disabled={loading} className="w-30">
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Profile;
