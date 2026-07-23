using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddItineraryCacheAndDayOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DayOrder",
                table: "Locations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ItineraryCaches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestHash = table.Column<string>(type: "text", nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItineraryCaches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItineraryCaches_TravelGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "TravelGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItineraryCaches_GroupId_RequestHash",
                table: "ItineraryCaches",
                columns: new[] { "GroupId", "RequestHash" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItineraryCaches");

            migrationBuilder.DropColumn(
                name: "DayOrder",
                table: "Locations");
        }
    }
}
