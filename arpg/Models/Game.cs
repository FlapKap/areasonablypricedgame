﻿namespace arpg.Models
{
    public class Game
    {
        public Game(int id, string title, string genre)
        {
            Id = id;
            Title = title;
            Genre = genre;
        }

        public int Id { get; set; }
        public string Title { get; set; }
        public string Genre { get; set; }
    }
}