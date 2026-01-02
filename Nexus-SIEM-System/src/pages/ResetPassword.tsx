import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { resetPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Key } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {

    const emailFromUrl = searchParams.get("email");
    const emailFromState = (location.state as { email?: string })?.email;

    if (emailFromUrl) {

      const decodedEmail = decodeURIComponent(emailFromUrl);
      setEmail(decodedEmail);

    } else if (emailFromState) {
      setEmail(emailFromState);
    } else {

      setError("No password reset email found. Please request a new password reset.");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    }
  }, [navigate, searchParams, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email not found. Please request a new password reset.");
      return;
    }

    if (!otpCode || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }


    if (!/^\d{6}$/.test(otpCode)) {
      setError("OTP code must be 6 digits");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }


    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters long. Consider using a longer passphrase for better security.");
      return;
    }

    if (newPassword.length > 128) {
      setError("Password is too long (maximum 128 characters)");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(email, otpCode, newPassword, confirmPassword);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(result.error || "Failed to reset password. The OTP code may be invalid or expired.");
      }
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        { }
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/Application_Logo.png" alt="Nexus SIEM Logo" className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">NEXUS SEIM SYSTEM</h1>
          <p className="text-muted-foreground">Reset Your Password</p>
        </div>

        { }
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter the OTP code sent to your email and your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              { }
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}


              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password reset successfully! Redirecting to login...
                  </AlertDescription>
                </Alert>
              )}

              { }
              <div className="space-y-2">
                <Label htmlFor="otp-code">OTP Code (6 digits)</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp-code"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replaceAll(/\D/g, '').slice(0, 6);
                      setOtpCode(value);
                    }}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    disabled={isLoading || success}
                    required
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
              </div>


              <div className="space-y-2">
                <Label htmlFor="new-password">New Password or Passphrase</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter password or passphrase (min 12 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading || success}
                    required
                    minLength={12}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading || success}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Minimum 12 characters (16+ recommended for better security)</p>
                  <p>• Passphrases (multi-word passwords) are encouraged</p>
                  <p>• Spaces and all characters are allowed</p>
                  {newPassword.length >= 12 && newPassword.length < 16 && (
                    <p className="text-amber-600 dark:text-amber-400">💡 Tip: Use 16+ characters for stronger protection</p>
                  )}
                  {newPassword.length >= 16 && (
                    <p className="text-green-600 dark:text-green-400">✓ Excellent! Your passphrase is strong</p>
                  )}
                </div>
              </div>

              { }
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading || success}
                    required
                    minLength={12}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading || success}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>


              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || success}
              >
                {(() => {
                  if (isLoading) return "Resetting...";
                  if (success) return "Password Reset!";
                  return "Reset Password";
                })()}
              </Button>

              { }
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>


        <p className="text-center text-sm text-muted-foreground mt-6" style={{ fontSize: '12px' }}>
          © 2025 NEXUS SIEM. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
