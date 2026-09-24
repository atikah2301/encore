-- One-off script to populate a few sample venues to develop/test against.
-- NOT a migration: run by hand in the Supabase SQL editor after the
-- migrations in supabase/migrations/, and not referenced by the deploy
-- pipeline. Feel free to edit/re-run as you like.

insert into encore.venues (name, address) values
  ('National Theatre', 'Upper Ground, South Bank, London SE1 9PX'),
  ('Old Vic', '103 The Cut, London SE1 8NB'),
  ('Wyndham''s Theatre', 'Charing Cross Rd, London WC2H 0DA'),
  ('Barbican Centre', 'Silk St, London EC2Y 8DS'),
  ('Sondheim Theatre', '51 Shaftesbury Ave, London W1D 6BA'),
  ('Palace Theatre', '113 Shaftesbury Ave, London W1D 5AY'),
  ('Theatre Royal Drury Lane', 'Catherine St, London WC2B 5JF'),
  ('Prince of Wales Theatre', 'Coventry St, London W1D 6AS'),
  ('Adelphi Theatre', 'Strand, London WC2E 7NA'),
  ('Lyceum Theatre', '21 Wellington St, London WC2E 7RQ'),
  ('London Palladium', '8 Argyll St, London W1F 7TF'),
  ('KOKO', '1A Camden High St, London NW1 7JE'),
  ('Apollo Victoria Theatre', '17 Wilton Rd, London SW1V 1LG'),
  ('Troubadour Wembley Park Theatre', 'Wembley Park Blvd, Wembley HA9 0FD'),
  ('Troubadour Canary Wharf Theatre', 'Bridge House, 1 Water St, London E14 5AP'),
  ('Lyric Theatre', '29 Shaftesbury Ave, London W1D 7ES'),
  ('London Coliseum', 'St Martin''s Lane, London WC2N 4ES'),
  ('Dartford Park Open Air Theatre', 'Dartford Park, Central Park Ave, Dartford DA1 1EU'),
  ('Orchard Theatre', 'Home Gardens, Dartford DA1 1ED'),
  ('Cambridge Theatre', 'Earlham St, London WC2H 9HU'),
  ('Dominion Theatre', '268-269 Tottenham Court Rd, London W1T 7AQ'),
  ('The Other Palace', '12 Palace St, London SW1E 5JA'),
  ('Gielgud Theatre', '35 Shaftesbury Ave, London W1D 6AR'),
  ('New Theatre Oxford', 'George St, Oxford OX1 2AG'),
  ('Apollo Theatre', '31 Shaftesbury Ave, London W1D 7EZ'),
  ('Harold Pinter Theatre', '6 Panton St, London SW1Y 4DN'),
  ('Noël Coward Theatre', '85-88 St Martin''s Lane, London WC2N 4AP'),
  ('Phoenix Theatre', '110 Charing Cross Rd, London WC2H 0JP'),
  ('St Martin''s Theatre', 'West St, London WC2H 9NZ'),
  ('Victoria Palace Theatre', 'Victoria St, London SW1E 5EA'),
  ('Sadler''s Wells', 'Rosebery Ave, London EC1R 4TN');
