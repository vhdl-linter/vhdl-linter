entity test_units is
end test_units;

architecture arch of test_units is

begin
  a_p : process
  begin
    wait for 6ns; -- expect space before unit reference
  end process;

end architecture;
