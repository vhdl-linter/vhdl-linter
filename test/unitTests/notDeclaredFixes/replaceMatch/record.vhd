entity foo is
end entity;
architecture arch of foo is
  type rec is record
    apple: integer;
  end record;
  signal test: rec; -- vhdl-linter-disable-line unused
begin
  test.appl <= tes.apple;
end arch;
