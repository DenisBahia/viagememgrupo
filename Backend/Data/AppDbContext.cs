using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TravelGroup> TravelGroups => Set<TravelGroup>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<LocationVote> LocationVotes => Set<LocationVote>();
    public DbSet<LocationAiTip> LocationAiTips => Set<LocationAiTip>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<TravelGroup>()
            .HasIndex(g => g.ShareKey)
            .IsUnique();

        modelBuilder.Entity<GroupMember>()
            .HasIndex(gm => new { gm.UserId, gm.GroupId })
            .IsUnique();

        modelBuilder.Entity<GroupMember>()
            .HasOne(gm => gm.User)
            .WithMany(u => u.GroupMemberships)
            .HasForeignKey(gm => gm.UserId);

        modelBuilder.Entity<GroupMember>()
            .HasOne(gm => gm.Group)
            .WithMany(g => g.Members)
            .HasForeignKey(gm => gm.GroupId);

        modelBuilder.Entity<Location>()
            .HasOne(l => l.Group)
            .WithMany(g => g.Locations)
            .HasForeignKey(l => l.GroupId);

        modelBuilder.Entity<Location>()
            .HasOne(l => l.AddedBy)
            .WithMany(u => u.AddedLocations)
            .HasForeignKey(l => l.AddedById);

        modelBuilder.Entity<LocationVote>()
            .HasIndex(v => new { v.LocationId, v.UserId })
            .IsUnique();

        modelBuilder.Entity<LocationVote>()
            .HasOne(v => v.Location)
            .WithMany(l => l.Votes)
            .HasForeignKey(v => v.LocationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LocationVote>()
            .HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LocationAiTip>()
            .HasIndex(t => t.LocationId)
            .IsUnique();

        modelBuilder.Entity<LocationAiTip>()
            .HasOne(t => t.Location)
            .WithOne()
            .HasForeignKey<LocationAiTip>(t => t.LocationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

