entity test is
  port (
    o : out integer --vhdl-linter-disable-this-line
    );
end test;
architecture arch of test is

  signal test : integer;

begin
  o    <= test;
  test <= 1;
end arch;
