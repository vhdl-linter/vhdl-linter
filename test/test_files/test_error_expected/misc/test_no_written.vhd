entity test is
  port (
    o_a : out integer
    );
end test;
architecture arch of test is

  signal test : integer;

begin
  o_a <= test;
end arch;
