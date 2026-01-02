const authDb = require('./database/authDb');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const { sendPasswordResetEmail, sendMFAPinEmail } = require('./utils/emailService');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const validatePassword = (password) => {

  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long. Consider using a longer passphrase for better security.'
    };
  }


  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password is too long (maximum 128 characters)'
    };
  }

  return { valid: true };
};

const authenticateUser = async (email, password) => {
  const result = await authDb.query(
    `SELECT auth.user_id, auth.username, auth.email, auth.password_hash, auth.account_status, r.role_name
       FROM authentication auth
       JOIN user_roles ur ON auth.user_id = ur.user_id
       JOIN role r ON ur.role_id = r.role_id
       WHERE auth.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  if (user.account_status !== 'active') {
    throw new Error('Account is not active');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return null;
  }

  await authDb.query('UPDATE authentication SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);
  return { user_id: user.user_id, username: user.username, email: user.email, role: user.role_name };
};

async function authRoutes(fastify, options) {



  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      request.log.error(err);
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized'
      });
    }
  });


  const requireRole = (allowedRoles) => {
    return async (request, reply) => {

      const userRole = request.user.role;

      if (!userRole) {
        return reply.code(403).send({
          success: false,
          error: 'User role not found in token'
        });
      }


      const normalizedUserRole = userRole.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied'
        });
      }
    };
  };


  fastify.get('/users', {
    onRequest: [fastify.authenticate, requireRole(['Admin'])]
  }, async (request, reply) => {
    try {
      const result = await authDb.query(`
        SELECT auth.user_id, auth.username, auth.email, auth.account_status, auth.created_date, r.role_name
        FROM authentication auth
        JOIN user_roles ur ON auth.user_id = ur.user_id
        JOIN role r ON ur.role_id = r.role_id
        ORDER BY auth.created_date DESC
      `);
      return { success: true, users: result.rows };
    } catch (error) {
      console.error('Fetch users failed:', error);
      return reply.code(500).send({ success: false, error: 'Failed to fetch users' });
    }
  });

  fastify.delete('/users/:id', {
    onRequest: [fastify.authenticate, requireRole(['Admin'])]
  }, async (request, reply) => {
    const userIdToDelete = request.params.id;
    const adminId = request.user.user_id;

    console.log(`[DELETE /users/:id] Request to delete user ${userIdToDelete} by admin ${adminId}`);

    if (userIdToDelete == adminId) {
      console.warn(`[DELETE /users/:id] Admin ${adminId} tried to delete themselves`);
      return reply.code(400).send({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    try {
      const client = await authDb.pool.connect();
      try {
        await client.query('BEGIN');

        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userIdToDelete]);

        const result = await client.query('DELETE FROM authentication WHERE user_id = $1 RETURNING user_id', [userIdToDelete]);

        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return reply.code(404).send({
            success: false,
            error: 'User not found'
          });
        }

        await client.query('COMMIT');
        return { success: true, message: 'User deleted successfully' };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      return reply.code(500).send({ success: false, error: 'Failed to delete user' });
    }
  });

  fastify.get('/roles', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await authDb.query('SELECT role_id, role_name, description FROM role ORDER BY role_name');
      return { success: true, roles: result.rows };
    } catch (error) {
      if (error.code === '42P01') {
        return { success: true, roles: [] };
      }
      return reply.code(500).send({ success: false, error: 'Failed to fetch roles' });
    }
  });

  fastify.post('/users', {
    onRequest: [fastify.authenticate, requireRole(['Admin'])]
  }, async (request, reply) => {
    const { username, email, role_name } = request.body;

    if (!username || !email || !role_name) {
      return reply.code(400).send({
        success: false,
        error: 'Username, email, and role are required'
      });
    }

    try {
      const client = await authDb.pool.connect();

      try {
        await client.query('BEGIN');

        const existingUser = await client.query(
          'SELECT user_id FROM authentication WHERE email = $1 OR username = $2',
          [email, username]
        );

        if (existingUser.rows.length > 0) {
          await client.query('ROLLBACK');
          return reply.code(409).send({
            success: false,
            error: 'User with this email or username already exists'
          });
        }

        const defaultPassword = process.env.NEW_USER_PASSWORD;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const salt = await bcrypt.genSalt(10);

        const userResult = await client.query(
          `INSERT INTO authentication (username, email, password_hash, salt, account_status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING user_id, username, email, account_status, created_date`,
          [username, email, passwordHash, salt]
        );

        const newUser = userResult.rows[0];

        const roleResult = await client.query(
          'SELECT role_id FROM role WHERE role_name = $1',
          [role_name]
        );

        if (roleResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return reply.code(400).send({
            success: false,
            error: `Role "${role_name}" does not exist. Please select an existing role.`
          });
        }

        const roleId = roleResult.rows[0].role_id;

        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [newUser.user_id, roleId]
        );

        await client.query('COMMIT');

        return reply.send({
          success: true,
          user: {
            user_id: newUser.user_id,
            username: newUser.username,
            email: newUser.email,
            role: role_name,
            account_status: newUser.account_status,
            created_date: newUser.created_date
          },
          message: `User created successfully. Temporary password: Auto Generated. Please change it after login.`
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error.code === '23505') {
        return reply.code(409).send({
          success: false,
          error: 'User already exists'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to create user'
      });
    }
  });

  fastify.post('/change-password', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { oldPassword, newPassword, confirmPassword } = request.body;
    const userId = request.user.user_id;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Old password, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return reply.code(400).send({
        success: false,
        error: validation.error
      });
    }

    try {
      const client = await authDb.pool.connect();
      try {

        const userResult = await client.query('SELECT password_hash FROM authentication WHERE user_id = $1', [userId]);

        if (userResult.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'User not found'
          });
        }

        const currentPasswordHash = userResult.rows[0].password_hash;
        const passwordMatch = await bcrypt.compare(oldPassword, currentPasswordHash);

        if (!passwordMatch) {
          return reply.code(401).send({
            success: false,
            error: 'Incorrect old password'
          });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const salt = await bcrypt.genSalt(10);

        await client.query(
          'UPDATE authentication SET password_hash = $1, salt = $2 WHERE user_id = $3',
          [passwordHash, salt, userId]
        );

        return reply.send({
          success: true,
          message: 'Password updated successfully'
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Change password failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update password'
      });
    }
  });

  fastify.post('/admin/reset-password', {
    onRequest: [fastify.authenticate, requireRole(['Admin'])]
  }, async (request, reply) => {
    const { email, newPassword, confirmPassword, adminPassword } = request.body;

    const adminId = request.user.user_id || request.user.id;

    if (!adminId) {
      return reply.code(401).send({ success: false, error: 'Admin user not found' });
    }

    if (!email || !newPassword || !confirmPassword || !adminPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Email, new password, confirm password, and admin password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return reply.code(400).send({
        success: false,
        error: validation.error
      });
    }

    try {
      const client = await authDb.pool.connect();
      try {

        const adminResult = await client.query('SELECT password_hash FROM authentication WHERE user_id = $1', [adminId]);
        if (adminResult.rows.length === 0) {
          return reply.code(401).send({ success: false, error: 'Admin user not found' });
        }

        const adminPasswordMatch = await bcrypt.compare(adminPassword, adminResult.rows[0].password_hash);
        if (!adminPasswordMatch) {
          return reply.code(401).send({ success: false, error: 'Incorrect admin password' });
        }

        const userResult = await client.query(
          'SELECT user_id FROM authentication WHERE email = $1 OR username = $2',
          [email, email]
        );

        if (userResult.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'User not found'
          });
        }

        const user = userResult.rows[0];

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const salt = await bcrypt.genSalt(10);

        await client.query(
          'UPDATE authentication SET password_hash = $1, salt = $2 WHERE user_id = $3',
          [passwordHash, salt, user.user_id]
        );

        return reply.send({
          success: true,
          message: 'Password updated successfully'
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Admin reset password failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to reset password'
      });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ success: false, error: 'Email and password are required' });
    }

    try {
      const user = await authenticateUser(email, password);
      if (!user) {
        return reply.code(401).send({ success: false, error: 'Invalid email or password' });
      }

      const authMethod = (process.env.AUTH_METHOD || process.env.AUTH_MODE || 'MFA').toUpperCase();
      if (authMethod === 'PASSWORD' || authMethod === 'DIRECT') {
        const token = fastify.jwt.sign({
          user_id: user.user_id,
          role: user.role
        });
        await authDb.query('UPDATE authentication SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);
        return reply.send({
          success: true,
          requiresMFA: false,
          token,
          user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }

      const mfaPin = crypto.randomInt(100000, 1000000).toString();

      const mfaPinExpires = new Date(Date.now() + 120000);

      await authDb.query(
        'UPDATE authentication SET mfa_pin = $1, mfa_pin_expires = $2 WHERE user_id = $3',
        [mfaPin, mfaPinExpires, user.user_id]
      );

      console.log(`MFA PIN for ${user.email}: ${mfaPin}`);

      try {
        await sendMFAPinEmail(user.email, mfaPin);
      } catch (emailError) {
        console.error('Send MFA PIN email failed:', emailError);
      }

      return reply.send({
        success: true,
        requiresMFA: true,
        email: user.email
      });
    } catch (error) {
      if (error.message === 'Account is not active') {
        return reply.code(403).send({ success: false, error: 'Account is not active' });
      }
      return reply.code(500).send({ success: false, error: 'Login failed' });
    }
  });

  fastify.post('/verify-mfa', async (request, reply) => {
    const { email, pin } = request.body;

    if (!email || !pin || !/^\d{6}$/.test(pin)) {
      return reply.code(400).send({
        success: false,
        error: 'Valid email and 6-digit PIN required'
      });
    }

    try {
      const userResult = await authDb.query(
        `SELECT auth.user_id, auth.username, auth.email, auth.account_status, r.role_name
         FROM authentication auth
         JOIN user_roles ur ON auth.user_id = ur.user_id
         JOIN role r ON ur.role_id = r.role_id
         WHERE auth.email = $1 AND auth.mfa_pin = $2 AND auth.mfa_pin_expires > NOW() AND auth.account_status = 'active'`,
        [email, pin]
      );

      if (userResult.rows.length === 0) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid or expired PIN'
        });
      }

      const user = userResult.rows[0];

      await authDb.query(
        `UPDATE authentication 
         SET mfa_pin = NULL, mfa_pin_expires = NULL, last_login = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
        [user.user_id]
      );

      const token = fastify.jwt.sign({
        user_id: user.user_id,
        role: user.role_name
      });

      return reply.send({
        success: true,
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role_name
        }
      });
    } catch (error) {
      console.error('Verify MFA failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Verification failed'
      });
    }
  });

  fastify.post('/resend-mfa', async (request, reply) => {
    const { email } = request.body || {};
    if (!email) {
      return reply.code(400).send({ success: false, error: 'Email is required' });
    }
    try {
      const userResult = await authDb.query(
        'SELECT user_id, email FROM authentication WHERE email = $1',
        [email]
      );
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }
      const user = userResult.rows[0];
      const mfaPin = crypto.randomInt(100000, 1000000).toString();
      const mfaPinExpires = new Date(Date.now() + 300000);
      await authDb.query(
        'UPDATE authentication SET mfa_pin = $1, mfa_pin_expires = $2 WHERE user_id = $3',
        [mfaPin, mfaPinExpires, user.user_id]
      );
      const delivery = (process.env.MFA_DELIVERY || 'email').toLowerCase();
      if (delivery === 'email') {
        try {
          await sendMFAPinEmail(user.email, mfaPin);
        } catch {
          console.error('MFA email send failed');
        }
      }
      return reply.send({
        success: true,
        email: user.email,
        pin: delivery === 'response' ? mfaPin : undefined
      });
    } catch (error) {
      console.error('Resend MFA error:', error);
      return reply.code(500).send({ success: false, error: 'Resend failed' });
    }
  });
  fastify.post('/forgot-password', async (request, reply) => {
    const { email, frontendUrl: clientFrontendUrl } = request.body;

    if (!email) {
      return reply.code(400).send({ success: false, error: 'Email is required' });
    }

    try {

      const userResult = await authDb.query(
        'SELECT user_id, email, username FROM authentication WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return reply.send({
          success: true,
          message: 'If a user with that email exists, a password reset code has been sent.'
        });
      }

      const user = userResult.rows[0];

      const crypto = require('node:crypto');
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const resetCodeExpires = new Date(Date.now() + 600000);

      await authDb.query(
        'UPDATE authentication SET reset_code = $1, reset_code_expires = $2 WHERE user_id = $3',
        [otpCode, resetCodeExpires, user.user_id]
      );

      const frontendUrl = clientFrontendUrl || process.env.FRONTEND_URL;
      const encodedEmail = encodeURIComponent(user.email);
      const resetUrl = `${frontendUrl}/reset-password?email=${encodedEmail}`;

      console.log(`Password reset OTP for ${user.email}: ${otpCode}`);

      try {
        await sendPasswordResetEmail(user.email, otpCode, resetUrl);
        return reply.send({
          success: true,
          message: 'If a user with that email exists, a password reset code has been sent.'
        });
      } catch (emailError) {
        console.error('Send password reset email failed:', emailError);

        return reply.send({
          success: true,
          message: 'If a user with that email exists, a password reset code has been sent.'
        });
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
      return reply.code(500).send({ success: false, error: 'Failed to process password reset request' });
    }
  });

  fastify.post('/reset-password', async (request, reply) => {
    const { email, otpCode, newPassword, confirmPassword } = request.body;

    if (!email || !otpCode || !newPassword || !confirmPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Email, OTP code, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return reply.code(400).send({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return reply.code(400).send({
        success: false,
        error: validation.error
      });
    }

    try {

      const userResult = await authDb.query(
        `SELECT user_id, reset_code, reset_code_expires 
         FROM authentication 
         WHERE email = $1 AND reset_code = $2 AND reset_code_expires > NOW()`,
        [email, otpCode]
      );

      if (userResult.rows.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid or expired OTP code'
        });
      }

      const user = userResult.rows[0];

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const salt = await bcrypt.genSalt(10);

      await authDb.query(
        `UPDATE authentication 
         SET password_hash = $1, salt = $2, reset_code = NULL, reset_code_expires = NULL 
         WHERE user_id = $3`,
        [passwordHash, salt, user.user_id]
      );

      return reply.send({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      console.error('Reset password failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to reset password'
      });
    }
  });
}

module.exports = authRoutes;
