entity
  for is
end for;

architecture arch of
  for is

begin
  a_p : process
    type integer_array is array (positive range <>) of integer;
    variable foo : integer_array(1 to 5);
  begin
    a : for i in foo'range loop
      foo(i) := 1;

    end loop;
  end process;

end architecture;
