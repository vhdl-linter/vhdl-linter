-- Testing multiple lesser used optionals of the assignment syntax
entity test_assignment is

end test_assignment;

architecture arch of test_assignment is
  signal target, Output_pin, Input_pin : integer; -- vhdl-linter-disable-line unused
begin
  target <= guarded 5;
  dummy_proc : process
  begin
    target     <= force in 5;
    target     <= force out 5;
    target     <= release in;
    target     <= release out;
    target     <= unaffected;
    target     <= transport unaffected;
    target     <= reject 5 ns inertial unaffected;
    target     <= reject 5 ns inertial 5;
    target     <= reject 5 ns inertial 5, 10       after 10 ns, null;
    target     <= unaffected when true else unaffected;
    -- Examples from 10.5.2.1
    Output_pin <= Input_pin                       after 10 ns;
    Output_pin <= inertial Input_pin              after 10 ns;
    Output_pin <= reject 10 ns inertial Input_pin after 10 ns;
  end process;
end architecture;
