using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, JwtService jwt, IConfiguration config, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Email já cadastrado." });

        var user = new User
        {
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwt.GenerateToken(user);
        return Ok(new AuthResponse(token, new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email ou senha inválidos." });

        var token = jwt.GenerateToken(user);
        return Ok(new AuthResponse(token, new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl)));
    }

    // Sign-in / sign-up with a Google Identity Services ID token obtained on the frontend.
    // Creates the user on first login (or links the Google account to an existing
    // email/password user), then returns our own JWT so the rest of the app works the same way.
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(GoogleLoginRequest req)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var clientId = config["GoogleAuth:ClientId"];
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = string.IsNullOrEmpty(clientId) ? null : [clientId]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);
        }
        catch (InvalidJwtException ex)
        {
            // Log the real reason (e.g. audience mismatch because GoogleAuth:ClientId doesn't
            // match the OAuth Client ID actually used on the frontend, expired token, etc.)
            // so it shows up in the Railway logs instead of just a generic 401 on the client.
            logger.LogWarning(ex, "Google ID token validation failed");
            return Unauthorized(new { message = "Token do Google inválido." });
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == payload.Subject || u.Email == payload.Email);

        if (user == null)
        {
            user = new User
            {
                Name = payload.Name ?? payload.Email,
                Email = payload.Email,
                GoogleId = payload.Subject,
                AvatarUrl = payload.Picture
            };
            db.Users.Add(user);
        }
        else
        {
            // Link the Google account to an existing user and keep profile info fresh.
            user.GoogleId ??= payload.Subject;
            user.AvatarUrl = payload.Picture ?? user.AvatarUrl;
        }

        await db.SaveChangesAsync();

        var token = jwt.GenerateToken(user);
        return Ok(new AuthResponse(token, new UserDto(user.Id, user.Name, user.Email, user.AvatarUrl)));
    }
}

