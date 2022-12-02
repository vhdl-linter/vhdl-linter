entity semicolon_parameter_list is
  procedure dummy (
    dummy : in integer; -- expect error about semicolon at end of interface listr
    )
  is
  begin
    report integer'image(dummy);
  end procedure;
begin
end entity;
