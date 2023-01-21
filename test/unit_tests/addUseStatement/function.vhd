library ieee;
entity dummy is
end dummy;
architecture arch of dummy is

  signal test : integer; -- vhdl-linter-disable-line unused

begin
  test <= to_integer(x"00");
end arch;  -- arch
