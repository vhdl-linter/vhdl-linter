entity semicolon_parameter_list is
  procedure dummy
  parameter ( -- This optional parameter here is legal vhdl
    i_dummy : in integer
    )
  is
  begin
    report integer'image(i_dummy);
  end procedure;
begin
dummy(5);
end entity;
