using System.Text;
using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Allow DateTime with Kind=Unspecified to be written to PostgreSQL timestamp with time zone
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Optional local overrides for secrets (kept out of git)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Database
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Auth
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Services
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<GoogleMapsService>();
builder.Services.AddScoped<GeminiService>();

// HttpClient for Google Maps (with redirect for goo.gl)
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("NoRedirect").ConfigurePrimaryHttpMessageHandler(() =>
    new HttpClientHandler { AllowAutoRedirect = false });

// CORS for local dev (React on :5173)
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Serve React static files (for production build)
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Fallback to React index.html
app.MapFallbackToFile("index.html");

app.Run();
