entity test is
  port (
    a_o : out integer --vhdl-linter-disable-this-line
    );
end test;
architecture arch of test is

  signal test : integer;

begin
  a_o <= test;
end arch;
