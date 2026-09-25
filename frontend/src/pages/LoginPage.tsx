import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../api/axios';
import { useAuthStore } from '../store/auth.store';
import { loginSchema, type LoginForm } from '../utils/validation';
import type { ErrorEnvelope, SuccessEnvelope, AuthPayload } from '../types/user';
import { BallIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await apiClient.post<SuccessEnvelope<AuthPayload>>('/auth/login', data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const error = err as { response?: { data?: ErrorEnvelope } };
      setServerError(error.response?.data?.error?.message ?? 'Login failed');
    }
  };

  return (
    <div className="kaibil-app">
      <div className="auth-screen">
        <div className="bg-halftone auth-screen__bg" aria-hidden="true" />

        <div className="auth-screen__content">
          <Card variant="rare">
            <span
              className="sticker"
              style={{ position: 'relative', top: 'auto', right: 'auto' }}
            >
              ⚽ Login
            </span>

            <h1
              style={{
                fontSize: 'var(--text-3xl)',
                marginTop: 'var(--space-3)',
                marginBottom: 'var(--space-2)',
              }}
            >
              ¡A la cancha!
            </h1>
            <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
              Inicia sesión para entrar a tu liga.
            </p>

            <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <TextField
                id="password"
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              {serverError && <Banner tone="error">{serverError}</Banner>}

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                startIcon={<BallIcon />}
              >
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>

            <p
              className="text-center text-muted"
              style={{ marginTop: 'var(--space-5)' }}
            >
              ¿No tienes cuenta? <Link to="/register">Crea una</Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
