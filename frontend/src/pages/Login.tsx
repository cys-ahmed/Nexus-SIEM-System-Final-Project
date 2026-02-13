import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login as authLogin, verifyMFA, forgotPassword, resendMFA } from "@/lib/auth";
import { useAuth } from "@/hook/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle, Key } from "lucide-react";

const Login = () => {
  const { isAuthenticated, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);


  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaPin, setMfaPin] = useState("");
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);


  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();


  const getDefaultRoute = () => {
    return role === "Analyst" ? "/logs" : "/";
  };
  const redirectAfterLogin = () => {
    const normalizedRole = role?.toLowerCase();
    const defaultRoute = normalizedRole === "analyst" ? "/UserDashboard" : "/";
    const lastPath = localStorage.getItem("last_path");


    const targetRoute = (location.state as { from?: Location })?.from?.pathname || lastPath || defaultRoute;
    navigate(targetRoute, { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated) {
      const defaultRoute = getDefaultRoute();
      const targetRoute = (location.state as { from?: Location })?.from?.pathname || defaultRoute;
      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, role, navigate, location, getDefaultRoute]);

  useEffect(() => {
    if (requiresMFA) {
      setCanResend(false);
      setCooldown(60);
    }
  }, [requiresMFA]);

  useEffect(() => {
    if (!requiresMFA) return;
    if (canResend) return;
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [requiresMFA, cooldown, canResend]);

  useEffect(() => {
    const pinValid = /^\d{6}$/.test(mfaPin);
    if (!requiresMFA) return;
    if (!pinValid) return;
    if (isVerifyingMFA) return;
    const run = async () => {
      setIsVerifyingMFA(true);
      try {
        const success = await verifyMFA(mfaEmail, mfaPin);
        if (success) {
          setTimeout(redirectAfterLogin, 100);
        } else {
          setError("Invalid or expired PIN");
          setMfaPin("");
        }
      } catch {
        setError("Verification failed. Please try again.");
      } finally {
        setIsVerifyingMFA(false);
      }
    };
    run();
  }, [mfaPin, requiresMFA, isVerifyingMFA, mfaEmail, redirectAfterLogin]);

  const handleResend = async () => {
    if (!canResend || !mfaEmail) return;
    setCanResend(false);
    setCooldown(60);

    setMfaPin("");
    try {


      await resendMFA(mfaEmail);
    } catch (e) {
      console.error("Failed to resend MFA:", e);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authLogin(email, password);

      if (result.success && result.requiresMFA) {
        setRequiresMFA(true);
        setMfaEmail(result.email || email);
        setPassword("");
      } else if (!result.success) {
        setError(result.error || "Invalid email or password");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(mfaPin)) {
      setError("PIN must be 6 digits");
      return;
    }

    setIsVerifyingMFA(true);
    try {
      const success = await verifyMFA(mfaEmail, mfaPin);

      if (success) {
        setTimeout(redirectAfterLogin, 100);
      } else {
        setError("Invalid or expired PIN");
        setMfaPin("");
      }
    } catch (err) {
      console.error("MFA verify error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);

    if (!forgotPasswordEmail) {
      setForgotPasswordError("Please enter your email address");
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await forgotPassword(forgotPasswordEmail);
      if (result.success) {

        setForgotPasswordSuccess(true);

        const emailToPass = forgotPasswordEmail;

        setTimeout(() => {
          setForgotPasswordOpen(false);
          setForgotPasswordSuccess(false);
          setForgotPasswordEmail("");

          navigate("/reset-password", { state: { email: emailToPass } });
        }, 2000);
      } else {
        setForgotPasswordError(result.error || "Failed to send reset email");
      }
    } catch {
      setForgotPasswordError("An error occurred. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        { }
        { }
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/Application_Logo.png" alt="Application Logo" className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">NEXUS SEIM SYSTEM</h1>
          <p className="text-muted-foreground">Security Information and Event Management</p>
        </div>

        { }
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {requiresMFA ? "Enter PIN Code" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-center">
              {requiresMFA ? "Check your email for the PIN code" : "Enter your credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requiresMFA ? (
              <form onSubmit={handleMFAVerify} className="space-y-4">
                { }
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                { }
                <div className="space-y-2">
                  <Label htmlFor="mfa-pin">PIN Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mfa-pin"
                      type="text"
                      placeholder="000000"
                      value={mfaPin}
                      onChange={(e) => {
                        setMfaPin(e.target.value.replaceAll(/\D/g, '').slice(0, 6));
                      }}
                      className="pl-10 text-center text-2xl tracking-widest font-mono"
                      disabled={isVerifyingMFA}
                      required
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Sent to {mfaEmail}
                  </p>
                </div>

                { }
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isVerifyingMFA}
                >
                  {isVerifyingMFA ? "Verifying..." : "Verify PIN"}
                </Button>

                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResend}
                    disabled={!canResend || isVerifyingMFA}
                  >
                    {canResend ? "Resend PIN" : `Resend available in ${cooldown}s`}
                  </Button>
                </div>

                { }
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresMFA(false);
                      setMfaPin("");
                      setMfaEmail("");
                      setError("");
                    }}
                    className="text-sm text-primary hover:underline"
                    disabled={isVerifyingMFA}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                { }
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                { }
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                { }
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                { }
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>


        <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a OTP to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotPasswordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{forgotPasswordError}</AlertDescription>
                </Alert>
              )}
              {forgotPasswordSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    If a user with that email exists, a password reset link has been sent to your email.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={isSendingReset || forgotPasswordSuccess}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setForgotPasswordEmail("");
                    setForgotPasswordError("");
                    setForgotPasswordSuccess(false);
                  }}
                  disabled={isSendingReset}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSendingReset || forgotPasswordSuccess}>
                  {isSendingReset ? "Sending..." : "Send Reset Code"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>


        <p className="text-center text-sm text-muted-foreground mt-6" style={{ fontSize: '12px' }}>
          © 2025 NEXUS SIEM. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
