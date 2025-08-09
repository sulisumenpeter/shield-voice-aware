import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Checking session…</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
