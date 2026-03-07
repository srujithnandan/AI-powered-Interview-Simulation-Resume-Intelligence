using System.Security.Claims;
using System.Security.Cryptography;
using MyWebApi.DTOs;
using MyWebApi.Helpers;
using MyWebApi.Models;
using MyWebApi.Repositories;
using MyWebApi.Settings;

namespace MyWebApi.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string userId, string refreshToken);
    Task RevokeAllTokensAsync(string userId);
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task<UserProfileResponse> GetProfileAsync(string userId);
    Task<UserProfileResponse> UpdateProfileAsync(string userId, UpdateProfileRequest request);
    Task<string> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtHelper _jwtHelper;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtHelper jwtHelper,
        JwtSettings jwtSettings)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtHelper = jwtHelper;
        _jwtSettings = jwtSettings;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existing = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (existing is not null)
        {
            throw new InvalidOperationException("User with this email already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = "User",
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        var refreshToken = _jwtHelper.GenerateRefreshToken();
        user.RefreshTokens.Add(refreshToken);

        await _userRepository.CreateAsync(user);

        return new AuthResponse
        {
            Message = "Registration successful",
            Token = _jwtHelper.GenerateToken(user),
            RefreshToken = refreshToken.Token,
            TokenExpiry = _jwtHelper.GetTokenExpiry(),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role
        };
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(email);
        if (user is null)
        {
            return null;
        }

        if (!user.IsActive)
        {
            throw new InvalidOperationException("Account is deactivated. Contact support.");
        }

        // Check lockout
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingMinutes = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
            throw new InvalidOperationException($"Account is locked. Try again in {remainingMinutes} minute(s).");
        }

        var isValid = _passwordHasher.Verify(request.Password, user.PasswordHash);
        if (!isValid)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= _jwtSettings.MaxFailedLoginAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(_jwtSettings.LockoutMinutes);
                user.FailedLoginAttempts = 0;
                await _userRepository.UpdateAsync(user);
                throw new InvalidOperationException($"Account locked due to {_jwtSettings.MaxFailedLoginAttempts} failed attempts. Try again in {_jwtSettings.LockoutMinutes} minutes.");
            }

            await _userRepository.UpdateAsync(user);
            return null;
        }

        // Successful login — reset lockout
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = DateTime.UtcNow;

        // Clean up old refresh tokens (keep last 5 active)
        RemoveOldRefreshTokens(user);

        var refreshToken = _jwtHelper.GenerateRefreshToken();
        user.RefreshTokens.Add(refreshToken);

        await _userRepository.UpdateAsync(user);

        return new AuthResponse
        {
            Message = "Login successful",
            Token = _jwtHelper.GenerateToken(user),
            RefreshToken = refreshToken.Token,
            TokenExpiry = _jwtHelper.GetTokenExpiry(),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role
        };
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        // Find user with this refresh token
        var user = await FindUserByRefreshToken(refreshToken);
        if (user is null) return null;

        var existingToken = user.RefreshTokens.SingleOrDefault(t => t.Token == refreshToken);
        if (existingToken is null) return null;

        if (existingToken.IsRevoked)
        {
            // Token reuse detected — revoke all tokens for security
            foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
            {
                token.RevokedAt = DateTime.UtcNow;
            }
            await _userRepository.UpdateAsync(user);
            return null;
        }

        if (!existingToken.IsActive) return null;

        // Rotate: revoke old, create new
        var newRefreshToken = _jwtHelper.GenerateRefreshToken();
        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.ReplacedByToken = newRefreshToken.Token;

        user.RefreshTokens.Add(newRefreshToken);
        RemoveOldRefreshTokens(user);
        await _userRepository.UpdateAsync(user);

        return new AuthResponse
        {
            Message = "Token refreshed",
            Token = _jwtHelper.GenerateToken(user),
            RefreshToken = newRefreshToken.Token,
            TokenExpiry = _jwtHelper.GetTokenExpiry(),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role
        };
    }

    public async Task RevokeTokenAsync(string userId, string refreshToken)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var token = user.RefreshTokens.SingleOrDefault(t => t.Token == refreshToken);
        if (token is null || !token.IsActive)
        {
            throw new InvalidOperationException("Invalid or already revoked token.");
        }

        token.RevokedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
    }

    public async Task RevokeAllTokensAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _userRepository.UpdateAsync(user);
    }

    public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Current password is incorrect.");
        }

        if (request.CurrentPassword == request.NewPassword)
        {
            throw new InvalidOperationException("New password must be different from the current password.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.PasswordChangedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        // Revoke all refresh tokens on password change
        foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _userRepository.UpdateAsync(user);
    }

    public async Task<UserProfileResponse> GetProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        return MapToProfile(user);
    }

    public async Task<UserProfileResponse> UpdateProfileAsync(string userId, UpdateProfileRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        user.FullName = request.FullName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        return MapToProfile(user);
    }

    public async Task<string> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(email);

        // Always return success to prevent email enumeration
        if (user is null)
        {
            return "If an account with that email exists, a password reset link has been sent.";
        }

        var resetToken = GenerateSecureToken();
        user.PasswordResetToken = resetToken;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        // In production: send email with reset link containing the token
        // For development: return the token in the response
        return resetToken;
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(email)
            ?? throw new InvalidOperationException("Invalid reset request.");

        if (user.PasswordResetToken is null ||
            user.PasswordResetToken != request.Token ||
            user.PasswordResetTokenExpiry is null ||
            user.PasswordResetTokenExpiry.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invalid or expired reset token.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        user.PasswordChangedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        // Revoke all refresh tokens on password reset
        foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _userRepository.UpdateAsync(user);
    }

    // Private helpers

    private async Task<User?> FindUserByRefreshToken(string refreshToken)
    {
        return await _userRepository.GetByRefreshTokenAsync(refreshToken);
    }

    private static UserProfileResponse MapToProfile(User user)
    {
        return new UserProfileResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = user.CreatedAt
        };
    }

    private void RemoveOldRefreshTokens(User user)
    {
        // Remove tokens older than refresh token lifetime
        var cutoff = DateTime.UtcNow.AddDays(-_jwtSettings.RefreshTokenExpiryDays);
        user.RefreshTokens.RemoveAll(t => !t.IsActive && t.CreatedAt < cutoff);
    }

    private static string GenerateSecureToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToHexString(randomBytes).ToLowerInvariant();
    }
}
